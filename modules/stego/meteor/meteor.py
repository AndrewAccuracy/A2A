import torch

def num_same_from_beg(bits1, bits2):
    assert len(bits1) == len(bits2)
    for i in range(len(bits1)):
        if bits1[i] != bits2[i]:
            break
    return i

def bin_sort(l, token_indices, total, entropy):
    #compute entropy for upper bound on the number of bins we need

    bucket_size = total
    num_bins = 2**int(entropy+1)
    bucket_size = total / num_bins

    bins = [torch.empty(0, dtype=torch.long, device=l.device)] * num_bins
    value_in_bins = [0] * num_bins
    space_left_after = [total - i*bucket_size for i in range(0,num_bins)]


    token_bins = [torch.empty(0, dtype=torch.long, device=l.device)] * num_bins

    # Figuring out what the search order should be
    step_size = num_bins/4
    search_order = []
    priorities = [0]*num_bins
    priority = 0
    search_order.append(int(num_bins/2))
    search_order.append(0)
    priorities[int(num_bins/2)] = 0
    priorities[0] = 0
    while(step_size>=1):
        priority += 1
        for x in range(num_bins-int(step_size), -1, -int(step_size*2)):
            search_order.append(x)
            priorities[x] = priority
        step_size = step_size/2

    # Adding the actual elements
    for (item, token_index) in zip(l.tolist(), token_indices.tolist()):
        found_single_bucket_fit = False
        single_bucket_index = -1
        single_bucket_value = bucket_size

        found_multi_bucket_bumpless_fit = False
        multi_bucket_bumpless_index = -1
        multi_bucket_bumpless_value = total

        found_multi_bucket_bumping_fit = False
        multi_bucket_bumping_index = -1
        multi_bucket_bumping_value = total

        for i in search_order:  # for index in search_order
            if(item > space_left_after[i]):
                continue
            if(value_in_bins[i] >= bucket_size):
                continue

            # Priority of choices
            #  1. Can i place this thing in an empty bucket all on its own?
            #  2. Can i plan this somewhere where is doesnt have to bump anything else around?
            #    2a. Minimize the wasted space.  Aka use the smallest space (of equal priority) that accomplishes this goal
            #  3. If not (1) and (2), then put it in the space the bumps stuff the least.

            if(value_in_bins[i] + item > bucket_size): #Would overflow. 

                space_before_next_block = bucket_size - value_in_bins[i]
                for j in range(i+1, len(bins)):
                    if(value_in_bins[j] > 0): # We have found a bucket with something in it.  This is how much space we have here.
                        space_before_next_block = space_before_next_block + (bucket_size - value_in_bins[i])
                        break
                    else: # This was a empty bucket
                        space_before_next_block = space_before_next_block + bucket_size

                if((not found_multi_bucket_bumpless_fit) or (found_multi_bucket_bumpless_fit and priorities[i] <= priorities[multi_bucket_bumpless_index])): #This could potentially be a match

                    # If this is a valid space to put this without bumping and it is a better fit than previous spaces
                    if(space_before_next_block > item and space_before_next_block < multi_bucket_bumpless_value):
                        # set this to be the pointer!  we can fit stuff here
                        found_multi_bucket_bumpless_fit = True
                        multi_bucket_bumpless_index = i
                        multi_bucket_bumpless_value = space_before_next_block

                    # Find the overflow that will bump the least
                    if ( item - space_before_next_block < multi_bucket_bumping_value):
                        found_multi_bucket_bumping_fit = True
                        multi_bucket_bumping_index = i
                        multi_bucket_bumping_value = item - space_before_next_block

            if(value_in_bins[i] + item <= bucket_size): #Would fit
                if(single_bucket_value > value_in_bins[i]):
                    found_single_bucket_fit = True
                    single_bucket_value = value_in_bins[i]
                    single_bucket_index = i

        if (single_bucket_index == multi_bucket_bumpless_index == multi_bucket_bumping_index == -1):
            bins[0] = torch.cat( (torch.tensor([item], device=l.device), bins[0]), 0)
            token_bins[0] = torch.cat( (torch.tensor([token_index], device=l.device), token_bins[0]), 0)
            continue


        if found_single_bucket_fit:
            # We found somewhere we can actually fit!
            bins[single_bucket_index] = torch.cat( (bins[single_bucket_index], torch.tensor([item], device=l.device)), 0)  
            token_bins[single_bucket_index] = torch.cat( (token_bins[single_bucket_index], torch.tensor([token_index], device=l.device)), 0)  
            value_in_bins[single_bucket_index] += item
            for i in range(0, single_bucket_index+1):
                space_left_after[i] -= item

        elif found_multi_bucket_bumpless_fit:
            # Found somewhere we can put this without upsetting the force
            part_in_bucket = bucket_size - value_in_bins[multi_bucket_bumpless_index]
            part_overflow = item - part_in_bucket
            bins[multi_bucket_bumpless_index] = torch.cat( (bins[multi_bucket_bumpless_index], torch.tensor([item], device=l.device)), 0)
            token_bins[multi_bucket_bumpless_index] = torch.cat( (token_bins[multi_bucket_bumpless_index], torch.tensor([token_index], device=l.device)), 0)  
            value_in_bins[multi_bucket_bumpless_index] = bucket_size

            # Fill this bucket and continue overflowing
            j = multi_bucket_bumpless_index + 1
            for i in range(0, j):
                space_left_after[i] -= item

            while(part_overflow > 0):
                new_part_overflow = (value_in_bins[j] + part_overflow) - bucket_size
                value_in_bins[j] = min(bucket_size, part_overflow+value_in_bins[j]) # mark the bucket as filled
                space_left_after[j] -= part_overflow
                part_overflow = new_part_overflow
                j+=1

        else:
            part_in_bucket = bucket_size - value_in_bins[multi_bucket_bumping_index]
            part_overflow = item - part_in_bucket
            bins[multi_bucket_bumping_index] = torch.cat( (bins[multi_bucket_bumping_index], torch.tensor([item], device=l.device)), 0)
            token_bins[multi_bucket_bumping_index] = torch.cat( (token_bins[multi_bucket_bumping_index], torch.tensor([token_index], device=l.device)), 0)
            value_in_bins[multi_bucket_bumping_index] = bucket_size

            # Fill this bucket and continue overflowing
            j = multi_bucket_bumping_index + 1
            for i in range(0, j):
                space_left_after[i] -= item
            while(part_overflow > 0):
                new_part_overflow = (value_in_bins[j] + part_overflow) - bucket_size
                value_in_bins[j] = min(bucket_size, part_overflow+value_in_bins[j]) # mark the bucket as filled
                space_left_after[j] -= part_overflow
                part_overflow = new_part_overflow
                j+=1



    sorted_tensor = torch.cat(bins, 0)
    sorted_tokens = torch.cat(token_bins, 0)

    return sorted_tensor, sorted_tokens
def bits2int(bits):
    res = 0
    for i, bit in enumerate(bits):
        res += bit*(2**i)
    return res

def int2bits(inp, num_bits):
    if num_bits == 0:
        return []
    strlist = ('{0:0%db}'%num_bits).format(inp)
    return [int(strval) for strval in reversed(strlist)]

def Meteor_encoder(prob, indices, bit_stream, bit_index, PRG, precision = 52, is_sort = 0):

    topk = len(prob)
    mask = PRG.generate_bits(precision)
    # print(mask_generator.test)

    epsilon = 2**(-precision)
    cur_int_range = 2 ** (precision)

    prob, sorted_indices = torch.sort(prob, descending=True)
    indices = indices[sorted_indices]


    nonzero_indices = (prob < epsilon).nonzero().squeeze()
    if nonzero_indices.numel() > 0:
        if nonzero_indices.numel() == 1:
            first_nonzero_index = nonzero_indices.item()
            topk = min(max(2, first_nonzero_index), topk)     
        else:
            first_nonzero_index = nonzero_indices[0].item()
            topk = min(max(2, first_nonzero_index), topk)      
    

    
    prob = prob[:topk]
    indices = indices[:topk]

    def calculate_entropy(prob):
        # 选取概率大于0的元素进行熵计算
        mask = prob > 0
        prob_nonzero = prob[mask]
        log_prob_nonzero = torch.log2(prob_nonzero)
        entropy = -torch.sum(prob_nonzero * log_prob_nonzero)
        return entropy.item()
    entropy_in_this_distribution = calculate_entropy(prob)

    # print(prob)
    prob = prob / torch.sum(prob)*cur_int_range
    # print(prob)

    prob = prob.round().long()
    if is_sort == 1:
        # print(entropy_in_this_distribution)
        # new_prob, new_indices = bin_sort(prob, indices, cur_int_range, entropy_in_this_distribution)
        # new_prob.reshape()
        cum_probs = prob.cumsum(0)
        overfill_index = (cum_probs > cur_int_range).nonzero()
        if len(overfill_index > 0):
            prob = prob[:overfill_index[0]]
            indices = indices[:overfill_index[0]]
        prob, indices = bin_sort(prob, indices, cur_int_range, entropy_in_this_distribution)

    cum_probs = prob.cumsum(0)

    overfill_index = (cum_probs > cur_int_range).nonzero()
    if len(overfill_index > 0):
        cum_probs = cum_probs[:overfill_index[0]]
    

    cum_probs += cur_int_range - cum_probs[-1]

    probs_final = cum_probs.clone()
    probs_final[1:] = cum_probs[1:] - cum_probs[:-1]    
    
    message_bits = [int(bit) for bit in bit_stream[bit_index:bit_index+precision]]
    
    # print(mask)
    # print(message_bits)
    for b in range(0, len(message_bits)):
        message_bits[b] = message_bits[b] ^ mask[b]

    message_idx = bits2int(reversed(message_bits))
    selection = (cum_probs > message_idx).nonzero()[0].item()

    new_int_bottom = cum_probs[selection-1] if selection > 0 else 0
    new_int_top = cum_probs[selection]
    
    new_int_bottom_bits_inc = list(reversed(int2bits(new_int_bottom, precision)))
    new_int_top_bits_inc = list(reversed(int2bits(new_int_top-1, precision))) # -1 here because upper bound is exclusive

    # Consume most significant bits which are now fixed and update interval
    num = num_same_from_beg(new_int_bottom_bits_inc, new_int_top_bits_inc)

    prev = indices[selection].view(1, 1)

    return prev, num


def Meteor_decoder(prob, indices, prev, PRG, precision = 52, is_sort = 0):

    topk = len(prob)

    epsilon = 2**(-precision)
    cur_int_range = 2 ** (precision)

    prob, sorted_indices = torch.sort(prob, descending=True)
    indices = indices[sorted_indices]


    nonzero_indices = (prob < epsilon).nonzero().squeeze()
    if nonzero_indices.numel() > 0:
        if nonzero_indices.numel() == 1:
            first_nonzero_index = nonzero_indices.item()
            topk = min(max(2, first_nonzero_index), topk)     
        else:
            first_nonzero_index = nonzero_indices[0].item()
            topk = min(max(2, first_nonzero_index), topk)      
    

    
    prob = prob[:topk]
    indices = indices[:topk]

    def calculate_entropy(prob):
        # 选取概率大于0的元素进行熵计算
        mask = prob > 0
        prob_nonzero = prob[mask]
        log_prob_nonzero = torch.log2(prob_nonzero)
        entropy = -torch.sum(prob_nonzero * log_prob_nonzero)
        return entropy.item()
    entropy_in_this_distribution = calculate_entropy(prob)

    # print(prob)
    prob = prob / torch.sum(prob)*cur_int_range
    # print(prob)

    prob = prob.round().long()
    if is_sort == 1:
        # print(entropy_in_this_distribution)
        # new_prob, new_indices = bin_sort(prob, indices, cur_int_range, entropy_in_this_distribution)
        # new_prob.reshape()
        cum_probs = prob.cumsum(0)
        overfill_index = (cum_probs > cur_int_range).nonzero()
        if len(overfill_index > 0):
            prob = prob[:overfill_index[0]]
            indices = indices[:overfill_index[0]]
        prob, indices = bin_sort(prob, indices, cur_int_range, entropy_in_this_distribution)

    cum_probs = prob.cumsum(0)

    overfill_index = (cum_probs > cur_int_range).nonzero()
    if len(overfill_index > 0):
        cum_probs = cum_probs[:overfill_index[0]]
    

    cum_probs += cur_int_range - cum_probs[-1]

    probs_final = cum_probs.clone()
    probs_final[1:] = cum_probs[1:] - cum_probs[:-1]    
    
    rank = (indices == prev).nonzero().item()
    selection = rank

    new_int_bottom = cum_probs[selection-1] if selection > 0 else 0
    new_int_top = cum_probs[selection]

    new_int_bottom_bits_inc = list(reversed(int2bits(new_int_bottom, precision)))
    new_int_top_bits_inc = list(reversed(int2bits(new_int_top-1, precision))) # -1 here because upper bound is exclusive

    num = num_same_from_beg(new_int_bottom_bits_inc, new_int_top_bits_inc)


    new_bits = new_int_top_bits_inc[:num]

    # Get the mask and apply it to the recovered bits
    mask_bits = PRG.generate_bits(precision)
    for b in range(0, len(new_bits)):
        new_bits[b] = new_bits[b] ^ mask_bits[b]

    new_bits = "".join([str(_) for _ in new_bits])
    return new_bits
