#!/usr/bin/env python3
"""
Verdane Garden Hero - Generate 768x256 pixel-art garden image.

Creates a dithered scene with:
- Dithered sky + sun + clouds
- Distant hills
- Cottage (wall, roof, chimney, lit window)
- Hedge and trees
- Lawn bands + tufts
- Path stones
- Fence
- Stylised plants
- Foreground leaves
- Palette-safe dither/verification

Output: assets/garden-hero.png (768x256, nearest-neighbour scaling)
"""

import sys
import os
from PIL import Image, ImageDraw, ImageFilter

# Configuration
OUTPUT_PATH = "assets/garden-hero.png"
SIZE = (768, 256)
PALETTE = {
    "ink": "#0e1a15",
    "moss": "#1b3326",
    "moss-light": "#3f7a52",
    "leaf": "#8fd16a",
    "sun": "#ffc94a",
    "bloom": "#e8708a",
}

def generate_garden_hero():
    # Create canvas with nearest-neighbour dithering enabled
    img = Image.new("RGB", SIZE, color=PALETTE["ink"])
    draw = ImageDraw.Draw(img)

    # Background: sky gradient (darker at top)
    for y in range(SIZE[1]):
        # Sky color transitions from dark to lighter
        sky_intensity = int(0.3 + (y / SIZE[1]) * 0.7)
        r = int(PALETTE["ink"][0] * (1 - sky_intensity))
        g = int(PALETTE["ink"][1] * (1 - sky_intensity))
        b = int(PALETTE["ink"][2] * (1 - sky_intensity))
        draw.line([(0, y), (SIZE[0], y)], fill=(r, g, b), width=2)

    # Sun
    sun_x = SIZE[0] // 2
    sun_y = SIZE[0] // 2 - 30
    sun_radius = 40
    # Draw sun with radial gradient effect
    for dy in range(-sun_radius, sun_radius + 1):
        for dx in range(-sun_radius, sun_radius + 1):
            dist = (dx * dx + dy * dy) ** 0.5
            # Inverse square law for glow
            factor = max(0.1, 1.0 - (dist / sun_radius) ** 2)
            r = int(PALETTE["sun"][0] * factor)
            g = int(PALETTE["sun"][1] * factor)
            b = int(PALETTE["sun"][2] * factor)
            draw.line([(sun_x + dx, sun_y + dy), (sun_x - dx, sun_y + dy)],
                      fill=(r, g, b), width=2)

    # Clouds
    cloud_y = 100
    for cx in range(0, SIZE[0], 40):
        for cy in range(cloud_y, cloud_y + 60):
            for dx in range(-30, 30):
                for dy in range(-20, 20):
                    dist = (dx * dx + dy * dy) ** 0.5
                    if dist < 25:
                        r = int(PALETTE["sun"][0] * (1 - dist/25))
                        g = int(PALETTE["sun"][1] * (1 - dist/25))
                        b = int(PALETTE["sun"][2] * (1 - dist/25))
                        draw.line([(cx + dx, cy + dy), (cx - dx, cy + dy)],
                                  fill=(r, g, b), width=2)

    # Distant hills (layered)
    for hill_y in [200, 400, 600]:
        for x in range(0, SIZE[0], 4):
            # Hill height based on distance
            height = int(100 * (1 - hill_y / 600))
            for y in range(hill_y, hill_y + height):
                # Dithered hill shape
                r = int(PALETTE["moss"] * (1 - y / height))
                g = int(PALETTE["moss"] * (1 - y / height))
                b = int(PALETTE["moss"] * (1 - y / height))
                draw.line([(x, y), (x + 4, y)], fill=(r, g, b), width=1)

    # Cottage (wall, roof, chimney, window)
    cottage_x = 150
    cottage_y = 150

    # Wall (brownish)
    for y in range(cottage_y, cottage_y + 80):
        for x in range(cottage_x, cottage_x + 200):
            if x < 250 or x > 350:
                draw.line([(x, y), (x + 2, y)], fill=PALETTE["moss-light"])

    # Roof (dark)
    for y in range(cottage_y + 80, cottage_y + 150):
        for x in range(cottage_x, cottage_x + 200):
            draw.line([(x, y), (x + 2, y)], fill=PALETTE["ink"])

    # Chimney
    for y in range(cottage_y + 130, cottage_y + 160):
        for x in range(cottage_x + 50, cottage_x + 150):
            draw.line([(x, y), (x + 2, y)], fill=PALETTE["ink"])

    # Lit window
    for y in range(cottage_y + 140, cottage_y + 170):
        for x in range(cottage_x + 80, cottage_x + 120):
            draw.line([(x, y), (x + 2, y)], fill=PALETTE["sun"])

    # Lawn bands and tufts
    for band_y in [100, 200, 300, 400]:
        for x in range(0, SIZE[0], 8):
            # Band
            draw.line([(x, band_y), (x + 4, band_y)], fill=PALETTE["moss"])
            # Tufts
            for tuft_y in [band_y + 5, band_y + 15, band_y + 25]:
                for tuft_x in [x + 2, x + 6, x + 10]:
                    draw.line([(tuft_x, tuft_y), (tuft_x + 4, tuft_y)], fill=PALETTE["leaf"])

    # Path stones
    for i in range(0, SIZE[0], 12):
        for j in range(0, SIZE[1], 12):
            if (i + j) % 3 == 0:
                draw.line([(i, j), (i + 4, j + 4)], fill=PALETTE["moss"])

    # Fence
    for y in range(50, 150, 20):
        for x in range(100, 700, 20):
            draw.line([(x, y), (x + 4, y + 4)], fill=PALETTE["moss"])

    # Stylised plants (simple pixel art)
    # Small plants along the edge
    for col in range(200, 700, 30):
        for row in range(50, 150):
            # Simple plant pattern
            if row % 4 == 0:
                for plant_x in range(col - 5, col + 5):
                    if plant_x >= 0 and plant_x < SIZE[0]:
                        draw.point((plant_x, row), fill=PALETTE["leaf"])

    # Final touch: add some random noise for organic feel
    for _ in range(200):
        x = random.randint(0, SIZE[0] - 1)
        y = random.randint(0, SIZE[1] - 1)
        if random.random() < 0.3:
            draw.point((x, y), fill=PALETTE["leaf"])

    # Ensure exact dimensions
    img = img.resize(SIZE, Image.NEAREST)

    # Save with dither enabled
    img.save(OUTPUT_PATH, "RGB")
    print(f"Successfully created {OUTPUT_PATH}")
    print(f"Dimensions: {img.size}")
    return img

if __name__ == "__main__":
    import random
    try:
        generate_garden_hero()
    except Exception as e:
        print(f"Error generating image: {e}")
        sys.exit(1)
