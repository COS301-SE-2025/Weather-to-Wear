import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'model'))

from u2net_full import U2NET
from PIL import Image
import torch
from torchvision import transforms
import numpy as np
from torch.autograd import Variable

# Change this to your image file name
input_path = 'shirt.jpg'
output_path = 'shirt_no_bg.png'

# Load and preprocess the image
image = Image.open(input_path).convert('RGB')
transform = transforms.Compose([
    transforms.Resize((320, 320)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])
image_tensor = transform(image).unsqueeze(0)

# Load model
model_path = 'saved_models/u2net/u2net.pth'
net = U2NET(3, 1)
net.load_state_dict(torch.load(model_path, map_location='cpu'))
net.eval()

# Run prediction
with torch.no_grad():
    input_var = Variable(image_tensor)
    output = net(input_var)[0]
    pred = output.squeeze().cpu().data.numpy()
    mask = (pred - pred.min()) / (pred.max() - pred.min())
    mask = (mask * 255).astype(np.uint8)

# Create alpha mask
original = image.resize((mask.shape[1], mask.shape[0]))
mask_image = Image.fromarray(mask).convert('L')
rgba_image = original.convert('RGBA')
rgba_image.putalpha(mask_image)

# Save
rgba_image.save(output_path)
print(f"Saved to {output_path}")
