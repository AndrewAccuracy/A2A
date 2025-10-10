# discop module wrapper
try:
    from .baselines.discop import Discop_encoder, Discop_base_encoder, Discop_decoder, Discop_base_decoder
except ImportError:
    # Fallback if the compiled module is not available
    print("Warning: discop compiled module not available, using fallback")
    class Discop_encoder:
        def __init__(self, *args, **kwargs):
            raise NotImplementedError("Discop_encoder not available")
    
    class Discop_base_encoder:
        def __init__(self, *args, **kwargs):
            raise NotImplementedError("Discop_base_encoder not available")
    
    class Discop_decoder:
        def __init__(self, *args, **kwargs):
            raise NotImplementedError("Discop_decoder not available")
    
    class Discop_base_decoder:
        def __init__(self, *args, **kwargs):
            raise NotImplementedError("Discop_base_decoder not available")
