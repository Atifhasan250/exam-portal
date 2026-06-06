$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$maskableSourceCandidates = @(
  (Join-Path $repoRoot 'public\icons\maskable.png'),
  (Join-Path $repoRoot 'public\icons\maskable-512.png')
)
$maskableSourcePath = $maskableSourceCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$splashSourcePath = Join-Path $repoRoot 'public\icons\icon-512.png'

if (-not $maskableSourcePath) {
  throw "Maskable source icon not found. Expected one of: $($maskableSourceCandidates -join ', ')"
}

if (-not (Test-Path -LiteralPath $splashSourcePath)) {
  throw "Splash source icon not found: $splashSourcePath"
}

$maskableSource = [System.Drawing.Image]::FromFile($maskableSourcePath)
$splashSource = [System.Drawing.Image]::FromFile($splashSourcePath)

function Save-ResizedPng {
  param(
    [System.Drawing.Image] $Source,
    [string] $Path,
    [int] $Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $graphics.Dispose()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$maskableTargets = @(
  @{ Path = 'public\icons\maskable-512.png'; Size = 512 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-mdpi\ic_maskable.png'; Size = 82 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-hdpi\ic_maskable.png'; Size = 123 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xhdpi\ic_maskable.png'; Size = 164 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxhdpi\ic_maskable.png'; Size = 246 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxxhdpi\ic_maskable.png'; Size = 328 }
)

$launcherTargets = @(
  @{ Path = 'android-twa\store_icon.png'; Size = 512 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-mdpi\ic_launcher.png'; Size = 48 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-hdpi\ic_launcher.png'; Size = 72 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xhdpi\ic_launcher.png'; Size = 96 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxhdpi\ic_launcher.png'; Size = 144 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png'; Size = 192 }
)

$splashTargets = @(
  @{ Path = 'android-twa\app\src\main\res\drawable-mdpi\splash.png'; Size = 300 },
  @{ Path = 'android-twa\app\src\main\res\drawable-hdpi\splash.png'; Size = 450 },
  @{ Path = 'android-twa\app\src\main\res\drawable-xhdpi\splash.png'; Size = 600 },
  @{ Path = 'android-twa\app\src\main\res\drawable-xxhdpi\splash.png'; Size = 900 },
  @{ Path = 'android-twa\app\src\main\res\drawable-xxxhdpi\splash.png'; Size = 1200 }
)

try {
  foreach ($target in $maskableTargets) {
    $targetPath = Join-Path $repoRoot $target.Path
    if ((Resolve-Path -LiteralPath $maskableSourcePath).Path -eq $targetPath) {
      Write-Output "Skipped $($target.Path) (source file)"
      continue
    }
    Save-ResizedPng -Source $maskableSource -Path $targetPath -Size $target.Size
    Write-Output "Updated maskable $($target.Path) ($($target.Size)x$($target.Size))"
  }

  foreach ($target in $launcherTargets) {
    $targetPath = Join-Path $repoRoot $target.Path
    Save-ResizedPng -Source $maskableSource -Path $targetPath -Size $target.Size
    Write-Output "Updated launcher $($target.Path) ($($target.Size)x$($target.Size))"
  }

  foreach ($target in $splashTargets) {
    $targetPath = Join-Path $repoRoot $target.Path
    Save-ResizedPng -Source $splashSource -Path $targetPath -Size $target.Size
    Write-Output "Updated splash $($target.Path) ($($target.Size)x$($target.Size))"
  }
} finally {
  $maskableSource.Dispose()
  $splashSource.Dispose()
}
