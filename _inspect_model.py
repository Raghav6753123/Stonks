import os
import torch
p='model.pth'
print('exists', os.path.exists(p))
try:
    m=torch.jit.load(p, map_location='cpu')
    print('type', 'jit', type(m))
except Exception as e:
    print('jit_fail', str(e)[:200])
    obj=torch.load(p, map_location='cpu')
    print('loaded_type', type(obj))
    if isinstance(obj, dict):
        print('keys', list(obj.keys())[:20])
        sd = obj.get('state_dict')
        if isinstance(sd, dict):
            print('state_dict_keys', list(sd.keys())[:20])
