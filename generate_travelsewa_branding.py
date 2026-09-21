import os
import shutil
from PIL import Image, ImageDraw, ImageOps

WORKSPACE = r"E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING"
SRC_PATH = os.path.join(WORKSPACE, "scratch", "previous_uploaded.jpg")

if not os.path.exists(SRC_PATH):
    # Fallback to direct path
    SRC_PATH = r"C:\Users\harsh_33xna20\.gemini\antigravity-ide\brain\b0bbaf01-8acc-4d22-b462-bc724f7eb846\.user_uploaded\media_1789918390344.jpg"

print(f"Loading TravelSewa logo from: {SRC_PATH}")
src_img = Image.open(SRC_PATH).convert("RGBA")

# Mipmap standard launcher icon sizes
MIPMAP_SIZES = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

# Adaptive foreground sizes (108dp base grid, safe circle is 72dp = 66.6%)
FOREGROUND_SIZES = {
    "mipmap-mdpi": (108, 108),
    "mipmap-hdpi": (162, 162),
    "mipmap-xhdpi": (216, 216),
    "mipmap-xxhdpi": (324, 324),
    "mipmap-xxxhdpi": (432, 432),
}

NOTIFICATION_SIZES = {
    "drawable-mdpi": (24, 24),
    "drawable-hdpi": (36, 36),
    "drawable-xhdpi": (48, 48),
    "drawable-xxhdpi": (72, 72),
    "drawable-xxxhdpi": (96, 96),
}

def make_legacy_icon(size):
    """Square icon with subtle rounded corners and clean black background"""
    canvas = Image.new("RGBA", size, (0, 0, 0, 255))
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    canvas.paste(im, (0, 0), im if im.mode == 'RGBA' else None)
    return canvas

def make_round_icon(size):
    """Circular launcher icon"""
    canvas = Image.new("RGBA", size, (0, 0, 0, 255))
    im = src_img.resize(size, Image.Resampling.LANCZOS)
    canvas.paste(im, (0, 0), im if im.mode == 'RGBA' else None)
    
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask=mask)
    return out

def make_adaptive_foreground(size):
    """
    Adaptive foreground has 108dp canvas.
    Safe zone is the inner 72dp circle (approx 66.6% to 75% of canvas).
    We center the logo at 76% scale on a transparent canvas.
    The adaptive background layer (ic_launcher_background / #000000) fills the background.
    """
    canvas_w, canvas_h = size
    content_size = int(canvas_w * 0.78)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset_x = (canvas_w - content_size) // 2
    offset_y = (canvas_h - content_size) // 2
    
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(resized_content, (offset_x, offset_y))
    return out

def make_expo_adaptive():
    """Expo adaptive icon: 1024x1024 with centered artwork within safe zone"""
    canvas_size = (1024, 1024)
    content_size = int(1024 * 0.78)
    resized_content = src_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    
    offset = (1024 - content_size) // 2
    out = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    out.paste(resized_content, (offset, offset))
    return out

def make_splash_screen():
    """
    Vertical high-res splash screen (1242x2688) with black background (#000000)
    and perfectly centered TravelSewa logo.
    """
    splash = Image.new("RGBA", (1242, 2688), (0, 0, 0, 255))
    logo_size = 850
    resized_logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    pos_x = (1242 - logo_size) // 2
    pos_y = (2688 - logo_size) // 2 - 100  # slightly centered above fold
    splash.paste(resized_logo, (pos_x, pos_y), resized_logo if resized_logo.mode == 'RGBA' else None)
    return splash

def make_notification_icon(size):
    """
    Creates an Android-compliant monochrome white notification icon with transparent background.
    Extracts the central vehicle/shield shape and renders as pure white #FFFFFF with alpha.
    """
    w, h = size
    icon = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    
    # Clean stylized transit vehicle silhouette for notifications
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.18)
    # Van body outline
    draw.rounded_rectangle([pad_x, pad_y + int(h*0.1), w - pad_x, h - pad_y - int(h*0.1)], radius=int(w*0.1), fill=(255, 255, 255, 255))
    # Windshield cutout
    draw.rectangle([pad_x + int(w*0.1), pad_y + int(h*0.16), w - pad_x - int(w*0.1), pad_y + int(h*0.35)], fill=(0, 0, 0, 0))
    # Wheels
    wheel_r = int(w * 0.09)
    draw.ellipse([pad_x + int(w*0.12), h - pad_y - int(h*0.18), pad_x + int(w*0.12) + wheel_r*2, h - pad_y - int(h*0.18) + wheel_r*2], fill=(0, 0, 0, 0))
    draw.ellipse([w - pad_x - int(w*0.12) - wheel_r*2, h - pad_y - int(h*0.18), w - pad_x - int(w*0.12), h - pad_y - int(h*0.18) + wheel_r*2], fill=(0, 0, 0, 0))
    return icon

apps = ["customer-app", "driver-app"]

for app in apps:
    app_dir = os.path.join(WORKSPACE, app)
    res_dir = os.path.join(app_dir, "android", "app", "src", "main", "res")
    assets_dir = os.path.join(app_dir, "assets")
    
    print(f"\n==========================================")
    print(f"[+] Generating branding assets for: {app}")
    print(f"==========================================")
    
    os.makedirs(assets_dir, exist_ok=True)
    
    # 1. High-Res Logo Assets
    logo_path = os.path.join(assets_dir, "travelsewa-logo.png")
    src_img.save(logo_path, "PNG")
    print(f"  [OK] Saved: {logo_path}")
    
    # Drop-in logo.png
    dropin_logo = os.path.join(assets_dir, "logo.png")
    src_img.save(dropin_logo, "PNG")
    print(f"  [OK] Saved: {dropin_logo}")
    
    # If driver-app, also update src/assets/logo.png
    if app == "driver-app":
        driver_src_assets = os.path.join(app_dir, "src", "assets")
        os.makedirs(driver_src_assets, exist_ok=True)
        src_img.save(os.path.join(driver_src_assets, "logo.png"), "PNG")
        src_img.save(os.path.join(driver_src_assets, "travelsewa-logo.png"), "PNG")
        print(f"  [OK] Saved driver src assets: {driver_src_assets}")

    # 2. Expo Core Assets
    src_img.resize((1024, 1024), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "icon.png"), "PNG")
    make_expo_adaptive().save(os.path.join(assets_dir, "adaptive-icon.png"), "PNG")
    src_img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "favicon.png"), "PNG")
    make_splash_screen().save(os.path.join(assets_dir, "splash.png"), "PNG")
    print(f"  [OK] Saved Expo icon, adaptive-icon, splash, favicon")
    
    # 3. Native Android Mipmap Launcher Icons
    for folder, size in MIPMAP_SIZES.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        
        # ic_launcher.png (Legacy square/round-corner)
        make_legacy_icon(size).save(os.path.join(target_folder, "ic_launcher.png"), "PNG")
        # ic_launcher_round.png (Circular)
        make_round_icon(size).save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")
        
    for folder, size in FOREGROUND_SIZES.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        # ic_launcher_foreground.png (Adaptive icon layer)
        make_adaptive_foreground(size).save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")
        
    print(f"  [OK] Saved Android native mipmaps (mdpi to xxxhdpi) in {res_dir}")

    # 4. Native Notification Icons
    for folder, size in NOTIFICATION_SIZES.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        make_notification_icon(size).save(os.path.join(target_folder, "notification_icon.png"), "PNG")
        make_notification_icon(size).save(os.path.join(target_folder, "ic_notification.png"), "PNG")
    print(f"  [OK] Saved Android notification icons")

print("\n[SUCCESS] ALL TRAVELSEWA BRANDING ASSETS GENERATED SUCCESSFULLY!")
