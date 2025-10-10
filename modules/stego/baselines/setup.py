from setuptools import setup
from Cython.Build import cythonize
import os

setup(
    ext_modules=cythonize("discop.pyx",
                            annotate=False,
                            compiler_directives={
                                'boundscheck': False,
                                'language_level': 3
                            })
)