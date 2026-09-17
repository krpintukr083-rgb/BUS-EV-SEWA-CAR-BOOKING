Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\harsh_33xna20\.gemini\antigravity-ide\brain\314287d7-69cd-49a6-91ae-f249e3732dad\travelease_app_icon_1789647257494.jpg"
$customerAppDir = "E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\customer-app"
$androidResDir = "$customerAppDir\android\app\src\main\res"
$assetsDir = "$customerAppDir\assets"

function Resize-Image {
    param (
        [string]$sourceFile,
        [string]$targetFile,
        [int]$width,
        [int]$height,
        [bool]$makeCircular = $false,
        [bool]$centerInCanvas = $false,
        [int]$canvasWidth = 0,
        [int]$canvasHeight = 0,
        [string]$bgColor = "#000000"
    )

    $src = [System.Drawing.Image]::FromFile($sourceFile)
    
    if ($centerInCanvas) {
        $bmp = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($bgColor))
        $g.FillRectangle($brush, 0, 0, $canvasWidth, $canvasHeight)
        $brush.Dispose()

        $x = ($canvasWidth - $width) / 2
        $y = ($canvasHeight - $height) / 2
        $g.DrawImage($src, $x, $y, $width, $height)
    } else {
        $bmp = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        if ($makeCircular) {
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $path.AddEllipse(0, 0, $width, $height)
            $g.SetClip($path)
        }
        $g.DrawImage($src, 0, 0, $width, $height)
    }

    $targetDir = [System.IO.Path]::GetDirectoryName($targetFile)
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $bmp.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Output "Generated: $targetFile ($width x $height)"
}

Write-Output "--- Generating React Native / Expo Assets ---"
Resize-Image -sourceFile $sourcePath -targetFile "$assetsDir\icon.png" -width 1024 -height 1024
Resize-Image -sourceFile $sourcePath -targetFile "$assetsDir\adaptive-icon.png" -width 1024 -height 1024
Resize-Image -sourceFile $sourcePath -targetFile "$assetsDir\favicon.png" -width 48 -height 48
Resize-Image -sourceFile $sourcePath -targetFile "$assetsDir\splash.png" -width 512 -height 512 -centerInCanvas $true -canvasWidth 1242 -canvasHeight 2436 -bgColor "#0a1128"

Write-Output "`n--- Generating Android Mipmap Icons ---"
$densities = @(
    @{ name = "mdpi"; size = 48; fgSize = 108 },
    @{ name = "hdpi"; size = 72; fgSize = 162 },
    @{ name = "xhdpi"; size = 96; fgSize = 216 },
    @{ name = "xxhdpi"; size = 144; fgSize = 324 },
    @{ name = "xxxhdpi"; size = 192; fgSize = 432 }
)

foreach ($d in $densities) {
    $folder = "$androidResDir\mipmap-$($d.name)"
    Resize-Image -sourceFile $sourcePath -targetFile "$folder\ic_launcher.png" -width $d.size -height $d.size
    Resize-Image -sourceFile $sourcePath -targetFile "$folder\ic_launcher_round.png" -width $d.size -height $d.size -makeCircular $true
    Resize-Image -sourceFile $sourcePath -targetFile "$folder\ic_launcher_foreground.png" -width $d.fgSize -height $d.fgSize
}

Write-Output "`n--- Generating Android Splash Drawables ---"
Resize-Image -sourceFile $sourcePath -targetFile "$androidResDir\drawable\splashscreen_image.png" -width 256 -height 256

Write-Output "`n🎉 All App Icons and Splash Assets Generated Successfully!"
