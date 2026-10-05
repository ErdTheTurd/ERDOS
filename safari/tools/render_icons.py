"""Draw the Blok mark into PNG sizes used by the app icon and the Safari extension."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BLUE = (47, 107, 255)
WHITE = (255, 255, 255)


def draw(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size), BLUE)
    pen = ImageDraw.Draw(image)
    scale = size / 64.0
    width = max(1, round(4 * scale))
    pen.rounded_rectangle(
        [14 * scale, 24 * scale, 50 * scale, 50 * scale],
        radius=7 * scale,
        outline=WHITE,
        width=width,
    )
    pen.rounded_rectangle(
        [24 * scale, 12 * scale, 40 * scale, 28 * scale],
        radius=4 * scale,
        fill=WHITE,
    )
    return image


def main() -> None:
    images = ROOT / "Extension" / "Resources" / "images"
    images.mkdir(parents=True, exist_ok=True)
    for size in (48, 96, 128, 256, 512):
        draw(size).save(images / f"icon-{size}.png")
    iconset = ROOT / "App" / "Assets.xcassets" / "AppIcon.appiconset"
    iconset.mkdir(parents=True, exist_ok=True)
    draw(1024).save(iconset / "AppIcon.png")


if __name__ == "__main__":
    main()
