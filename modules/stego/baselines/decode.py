import torch
from .utils import HuffmanCoding
import numpy as np
from configparser import ConfigParser
import prtpy
import math
import random

from ..discop import Discop_decoder,Discop_base_decoder


def msb_bits2int(bits):
    res = 0
    for i, bit in enumerate(bits[::-1]):
        res += bit * (2 ** i)
    return res


def msb_int2bits(inp, num_bits):
    if num_bits == 0:
        return []
    strlist = ('{0:0%db}' % num_bits).format(inp)
    return [int(strval) for strval in strlist]

#lsb
# e.g. [0, 1, 1, 1] looks like 1110=14
def lsb_bits2int(bits):
    res = 0
    for i, bit in enumerate(bits):
        res += bit * (2 ** i)
    return res


def lsb_int2bits(inp, num_bits):
    if num_bits == 0:
        return []
    strlist = ('{0:0%db}' % num_bits).format(inp)
    return [int(strval) for strval in reversed(strlist)]


def num_same_from_beg(bits1, bits2):
    assert len(bits1) == len(bits2)
    for i in range(len(bits1)):
        if bits1[i] != bits2[i]:
            break
    return i


def AC_decoder(prob, indices, prev, cur_interval, precision):
    prob, sorted_indices = torch.sort(prob, descending=True)
    indices = indices[sorted_indices]
    # prob = prob[:2 ** Generation_Configs.bit]
    # indices = indices[:2 ** Generation_Configs.bit]
    # arithmetic coding
    cur_int_range = cur_interval[1] - cur_interval[0]  # 区间的大小  2^26
    cur_threshold = 1 / cur_int_range  # 每个区间多大
    if prob[-1] < cur_threshold:
        k = max(2, (prob < cur_threshold).nonzero()[0].item())
        prob = prob[:k]
        indices = indices[:k]


    prob = prob / prob.sum()  # 截断后线性归一化
    prob = prob.double()
    prob *= cur_int_range  # 概率转换为多少个区间
    prob = prob.round().long()  # 四舍五入取整，区间数描述的概率

    cum_probs = prob.cumsum(0)  # 前面所有项的和的序列区间数描述的分布函数，按理讲最后应该与区间数相同
    overfill_index = (cum_probs > cur_int_range).nonzero()
    if len(overfill_index) > 0:
        cum_probs = cum_probs[:overfill_index[0]]  #去掉最后一个概率

    if prev in indices and prev not in indices[overfill_index]:
        cum_probs += cur_int_range - cum_probs[-1]  # 分布函数加到和区间数相等，区间数表示的分布函数
        cum_probs += cur_interval[0]  # 分布函数的第一项从左区间开始
        selection = (indices==prev).nonzero()[0].item()

        new_int_bottom = cum_probs[selection - 1] if selection > 0 else cur_interval[
            0]  # 新的左区间 如果选了第一个单词（selection=0）就代表不需要动区间的左边界
        new_int_top = cum_probs[selection]

        new_int_bottom_bits_inc = list(msb_int2bits(new_int_bottom, precision))  # 二进制的下边界
        new_int_top_bits_inc = list(msb_int2bits(new_int_top - 1, precision))
        # new_int_bottom_bits_inc = list(reversed(lsb_int2bits(new_int_bottom, precision)))  # 二进制的下边界
        # new_int_top_bits_inc = list(reversed(lsb_int2bits(new_int_top - 1, precision)))  # 二进制的上边界

        num_bits_encoded = num_same_from_beg(new_int_bottom_bits_inc, new_int_top_bits_inc)
        bits = "".join([str(b) for b in new_int_bottom_bits_inc[:num_bits_encoded]])
        new_int_bottom_bits = new_int_bottom_bits_inc[num_bits_encoded:] + [0] * num_bits_encoded  # 新二进制区间
        new_int_top_bits = new_int_top_bits_inc[num_bits_encoded:] + [1] * num_bits_encoded

        cur_interval[0] = msb_bits2int(new_int_bottom_bits)  # 新的区间
        cur_interval[1] = msb_bits2int(new_int_top_bits) + 1  # +1 here because upper bound is exclusive
        return cur_interval, bits
    else:
        return cur_interval, ""


def ac_decoder(prob, indices, prev, cur_interval, precision):
    return AC_decoder(prob, indices, prev, cur_interval, precision)

def discop_decoder(alg, prob, indices, prev, mask_generator, precision):
    if alg.lower() == "discop":
        return Discop_decoder(prob, indices, prev, mask_generator, precision)
    if alg.lower() == "discop_base":
        return Discop_base_decoder(prob, indices, prev, mask_generator, precision)
    raise ValueError("no such algorithm")
