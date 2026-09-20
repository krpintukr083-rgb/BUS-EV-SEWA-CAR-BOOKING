import os
from PIL import Image, ImageDraw

SRC_PATH = r"C:\Users\harsh_33xna20\.gemini\antigravity-ide\brain\b0bbaf01-8acc-4d22-b462-bc724f7eb846\.user_uploaded\media_1789918390344.jpg"
WORKSPACE = r"E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING"

src_img = Image.open(SRC_PATH).convert("RGBA")

# Sizes for standard launcher icons
MIPMAP_SIZES = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

# Sizes for adaptive foreground (108dp base)
FOREGROUND_SIZES = {
    "mipmap-mdpi": (108, 108),
    "mipmap-hdpi": (162, 162),
    "mipmap-xhdpi": (216, 216),
    "mipmap-xxhdpi": (324, 324),
    "mipmap-xxxhdpi": (432, 432),
}

def make_legacy_icon(size):
    """Square icon with black background and subtle rounded corners"""
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    return im

def make_round_icon(size):
    """Circular icon with black background"""
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mask=mask)
    return out

def make_adaptive_foreground(size):
    """
    Adaptive foreground has 108dp canvas.
    Safe zone is 72dp in center (approx 72% of canvas).
    We place the logo centered at 80% scale on transparent background
    (the background layer provides pure black #000000).
    """
    canvas_w, canvas_h = size
    content_size = int(canvas_w * 0.82)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset_x = (canvas_w - content_size) // 2
    offset_y = (canvas_h - content_size) // 2
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(resized_content, (offset_x, offset_y))
    return out

def make_expo_adaptive():
    """Expo adaptive icon: 1024x1024 with centered artwork"""
    canvas_size = (1024, 1024)
    content_size = int(1024 * 0.82)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset = (1024 - content_size) // 2
    out = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    out.paste(resized_content, (offset, offset))
    return out

apps = ["customer-app", "driver-app"]

for app in apps:
    app_dir = os.path.join(WORKSPACE, app)
    res_dir = os.path.join(app_dir, "android", "app", "src", "main", "res")
    assets_dir = os.path.join(app_dir, "assets")
    
    print(f"Processing {app}...")
    
    # 1. Expo assets
    os.makedirs(assets_dir, exist_ok=True)
    src_img.resize((1024, 1024), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "icon.png"), "PNG")
    make_expo_adaptive().save(os.path.join(assets_dir, "adaptive-icon.png"), "PNG")
    src_img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "favicon.png"), "PNG")
    print(f"  Saved Expo assets to {assets_dir}")
    
    # 2. Native mipmap icons
    for folder, size in MIPMAP_SIZES.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        
        # ic_launcher.png
        make_legacy_icon(size).save(os.path.join(target_folder, "ic_launcher.png"), "PNG")
        # ic_launcher_round.png
        make_round_icon(size).save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")
        
    for folder, size in FOREGROUND_SIZES.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        # ic_launcher_foreground.png
        make_adaptive_foreground(size).save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")
        
    print(f"  Saved native mipmaps to {res_dir}")

print("All app icons generated successfully!")
