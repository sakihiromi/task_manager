#!/usr/bin/env python3
"""
PWAアイコン生成スクリプト
Pillowを使ってPNGアイコンを生成します
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Required sizes for PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_png_icons():
    """PillowでPNGアイコンを生成"""
    
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    for size in SIZES:
        # Create image with gradient background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Draw rounded rectangle with gradient-like effect
        # Purple to pink gradient simulation
        for i in range(size):
            # Calculate gradient color
            ratio = i / size
            r = int(99 + (236 - 99) * ratio)  # 6366f1 to ec4899
            g = int(102 + (72 - 102) * ratio)
            b = int(241 + (153 - 241) * ratio)
            
            # Draw horizontal line
            draw.line([(0, i), (size, i)], fill=(r, g, b, 255))
        
        # Create rounded corners mask
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        radius = int(size * 0.2)  # 20% corner radius
        mask_draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=radius, fill=255)
        
        # Apply mask
        img.putalpha(mask)
        
        # Draw lightning bolt emoji (⚡) as text
        # Try to use system emoji font
        try:
            emoji_size = int(size * 0.5)
            # Try different emoji fonts
            for font_name in [
                '/System/Library/Fonts/Apple Color Emoji.ttc',  # macOS
                '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',  # Linux
                'seguiemj.ttf',  # Windows
            ]:
                try:
                    font = ImageFont.truetype(font_name, emoji_size)
                    break
                except:
                    continue
            else:
                # Fallback: draw a simple lightning shape
                font = None
        except:
            font = None
        
        if font:
            # Draw emoji
            text = "⚡"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x = (size - text_width) // 2
            y = (size - text_height) // 2
            draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
        else:
            # Draw a simple lightning bolt shape
            center = size // 2
            points = [
                (center + size*0.1, size*0.15),   # top
                (center - size*0.05, size*0.45),  # middle left
                (center + size*0.08, size*0.45),  # middle right
                (center - size*0.1, size*0.85),   # bottom
                (center + size*0.05, size*0.5),   # lower middle right
                (center - size*0.08, size*0.5),   # lower middle left
            ]
            points = [(int(x), int(y)) for x, y in points]
            draw.polygon(points, fill=(255, 255, 255, 255))
        
        # Save
        output_path = os.path.join(icons_dir, f'icon-{size}.png')
        img.save(output_path, 'PNG')
        print(f"✅ Created: icon-{size}.png")
    
    print(f"\n🎉 All icons generated in: {icons_dir}")
    print("   PWAインストールの準備完了！")

if __name__ == '__main__':
    generate_png_icons()
