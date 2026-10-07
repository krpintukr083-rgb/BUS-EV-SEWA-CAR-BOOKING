import os
import shutil
from PIL import Image, ImageDraw

WORKSPACE = r"E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING"
NEW_LOGO_PATH = os.path.join(WORKSPACE, "customer-app", "assets", "logo.png")

print(f"Loading authoritative YatraSewanp.com logo from: {NEW_LOGO_PATH}")
src_img = Image.open(NEW_LOGO_PATH).convert("RGBA")
print(f"Source image loaded successfully: {src_img.size}, mode={src_img.mode}")

# 1. Sizes for standard launcher icons
MIPMAP_SIZES = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

# 2. Sizes for adaptive foreground (108dp base grid, safe zone 72dp)
FOREGROUND_SIZES = {
    "mipmap-mdpi": (108, 108),
    "mipmap-hdpi": (162, 162),
    "mipmap-xhdpi": (216, 216),
    "mipmap-xxhdpi": (324, 324),
    "mipmap-xxxhdpi": (432, 432),
}

SPLASH_SIZES = {
    "drawable-mdpi": (320, 480),
    "drawable-hdpi": (480, 800),
    "drawable-xhdpi": (720, 1280),
    "drawable-xxhdpi": (960, 1600),
    "drawable-xxxhdpi": (1280, 1920),
}

def make_legacy_icon(size):
    """Square icon on white background with crisp resize"""
    canvas = Image.new("RGBA", size, (255, 255, 255, 255))
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    canvas.paste(im, (0, 0), im)
    return canvas

def make_round_icon(size):
    """Circular launcher icon on white circular background"""
    canvas = Image.new("RGBA", size, (255, 255, 255, 255))
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    canvas.paste(im, (0, 0), im)
    
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask=mask)
    return out

def make_adaptive_foreground(size):
    """
    Adaptive foreground: 108dp canvas with logo scaled to 78% in safe-zone.
    Transparent background (background layer provides white #FFFFFF).
    """
    canvas_w, canvas_h = size
    content_size = int(canvas_w * 0.78)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset_x = (canvas_w - content_size) // 2
    offset_y = (canvas_h - content_size) // 2
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(resized_content, (offset_x, offset_y), resized_content)
    return out

def make_expo_adaptive():
    """Expo adaptive icon: 1024x1024 with centered artwork within safe zone"""
    canvas_size = (1024, 1024)
    content_size = int(1024 * 0.78)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset = (1024 - content_size) // 2
    out = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    out.paste(resized_content, (offset, offset), resized_content)
    return out

def make_splash_screen():
    """
    Vertical high-res splash screen (1242x2688) with crisp white background (#FFFFFF)
    and perfectly centered YatraSewanp.com logo.
    """
    splash = Image.new("RGBA", (1242, 2688), (255, 255, 255, 255))
    logo_size = 850
    resized_logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    pos_x = (1242 - logo_size) // 2
    pos_y = (2688 - logo_size) // 2 - 100
    splash.paste(resized_logo, (pos_x, pos_y), resized_logo)
    return splash

# Update Customer App and Driver App
for app in ["customer-app", "driver-app"]:
    app_dir = os.path.join(WORKSPACE, app)
    res_dir = os.path.join(app_dir, "android", "app", "src", "main", "res")
    assets_dir = os.path.join(app_dir, "assets")
    
    print(f"\n[+] Updating branding assets for {app}...")
    os.makedirs(assets_dir, exist_ok=True)
    
    # 1. Base logo files
    src_img.save(os.path.join(assets_dir, "logo.png"), "PNG")
    if os.path.exists(os.path.join(assets_dir, "travelsewa-logo.png")):
        src_img.save(os.path.join(assets_dir, "travelsewa-logo.png"), "PNG")
        
    src_assets = os.path.join(app_dir, "src", "assets")
    if os.path.exists(src_assets):
        src_img.save(os.path.join(src_assets, "logo.png"), "PNG")
        if os.path.exists(os.path.join(src_assets, "travelsewa-logo.png")):
            src_img.save(os.path.join(src_assets, "travelsewa-logo.png"), "PNG")

    # 2. Expo app icons & splash
    src_img.resize((1024, 1024), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "icon.png"), "PNG")
    make_expo_adaptive().save(os.path.join(assets_dir, "adaptive-icon.png"), "PNG")
    src_img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "favicon.png"), "PNG")
    make_splash_screen().save(os.path.join(assets_dir, "splash.png"), "PNG")
    print(f"  [OK] Saved Expo assets in {assets_dir}")
    
    # 3. Android mipmaps
    if os.path.exists(res_dir):
        for folder, size in MIPMAP_SIZES.items():
            tf = os.path.join(res_dir, folder)
            os.makedirs(tf, exist_ok=True)
            make_legacy_icon(size).save(os.path.join(tf, "ic_launcher.png"), "PNG")
            make_round_icon(size).save(os.path.join(tf, "ic_launcher_round.png"), "PNG")
            
        for folder, size in FOREGROUND_SIZES.items():
            tf = os.path.join(res_dir, folder)
            os.makedirs(tf, exist_ok=True)
            make_adaptive_foreground(size).save(os.path.join(tf, "ic_launcher_foreground.png"), "PNG")
            
        for folder, size in SPLASH_SIZES.items():
            tf = os.path.join(res_dir, folder)
            if os.path.exists(tf):
                # centered logo on white background for splashscreen_image
                splash_im = Image.new("RGBA", size, (255, 255, 255, 255))
                l_sz = int(min(size) * 0.6)
                r_logo = src_img.resize((l_sz, l_sz), Image.Resampling.LANCZOS)
                px = (size[0] - l_sz) // 2
                py = (size[1] - l_sz) // 2
                splash_im.paste(r_logo, (px, py), r_logo)
                splash_im.save(os.path.join(tf, "splashscreen_image.png"), "PNG")
                
        print(f"  [OK] Saved native Android mipmaps and drawables in {res_dir}")

# Update Admin Panel
admin_pub = os.path.join(WORKSPACE, "admin-panel", "public")
os.makedirs(admin_pub, exist_ok=True)
src_img.save(os.path.join(admin_pub, "logo.png"), "PNG")
src_img.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(admin_pub, "favicon.png"), "PNG")
print(f"[OK] Updated Admin Panel public assets in {admin_pub}")

# Update Public Website
web_pub = os.path.join(WORKSPACE, "web", "public")
os.makedirs(web_pub, exist_ok=True)
src_img.save(os.path.join(web_pub, "logo.png"), "PNG")
src_img.resize((1024, 1024), Image.Resampling.LANCZOS).save(os.path.join(web_pub, "icon.png"), "PNG")
src_img.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(web_pub, "favicon.png"), "PNG")
print(f"[OK] Updated Public Website assets in {web_pub}")

print("\n[SUCCESS] All branding assets across Customer App, Driver App, Admin Panel, and Website updated with authoritative YatraSewanp.com logo!")
