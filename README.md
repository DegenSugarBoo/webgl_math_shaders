# Shader Playground

An interactive WebGL2 shader visualization playground featuring **iterative domain warping** techniques. Experiment with 5 different pattern variations and 6 adjustable parameters in real-time.

![Shader Playground](https://img.shields.io/badge/WebGL2-Shader-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Quick Start

```bash
# Clone and run
cd webgl_math_shaders
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

---

## 🎨 Pattern Variations

| Pattern | Description |
|---------|-------------|
| **Rocaille** | Original swirling plasma with organic tendrils |
| **Liquid Oil** | Smooth, flowing shapes without fractal detail |
| **Electric Grid** | Diamond-shaped patterns using Manhattan distance |
| **Kaleidoscope** | Symmetrical mandala patterns |
| **Alien Biome** | Full rainbow spectrum with IQ color palette |

## 🎛️ Adjustable Parameters

| Control | Effect |
|---------|--------|
| **Speed** | Animation playback speed |
| **Zoom** | How much of the pattern is visible |
| **Warp Strength** | Intensity of coordinate distortion |
| **Glow** | Thickness/sharpness of light strands |
| **Color Shift** | Phase offset in the color palette |
| **Detail** | Number of iterations (fractal complexity) |

---

## 🧮 The Mathematics

This shader uses several fundamental techniques from procedural graphics and fractal mathematics.

### 1. Domain Warping (Domain Distortion)

The core technique that creates organic, flowing patterns.

```glsl
v += sin(v.yx * f + i + t) / f;
```

**How it works:**
- Instead of drawing shapes directly, we *distort the coordinate space itself*
- Each pixel asks: "Where would I be if space was folded and twisted?"
- The `v.yx` swap (swizzling) makes distortion curl perpendicular to position, creating spirals

**Mathematical Form:**
```
v_{n+1} = v_n + A · sin(B · v_n + C)
```

Where:
- `v` = position vector
- `A` = amplitude (decreases with frequency)
- `B` = frequency multiplier  
- `C` = phase offset (animation + iteration)

---

### 2. Fractal Brownian Motion (fBM)

The multi-octave layering that creates natural complexity.

```glsl
for (float f = 1.0; f < 10.0; f++) {
    v += sin(...) / f;  // Amplitude decreases as frequency increases
}
```

**The Principle:**
- Layer multiple waves at different frequencies
- Each "octave" has higher frequency but lower amplitude
- Same math used in Perlin noise, terrain generation, and cloud rendering

**Formula:**
```
fBM(x) = Σ (1/fⁿ) · noise(f^n · x)
```

This creates the characteristic "detailed but coherent" look — big shapes with progressively finer detail.

---

### 3. Orbit Traps

The technique that creates the glowing, luminous strands.

```glsl
col += ... / length(v);  // Brighter when v is close to origin
```

**Origin:**
- Borrowed from Mandelbrot/Julia set rendering
- "Trap" points that pass close to a target location
- Distance to trap determines brightness

**Variations:**
| Distance Function | Visual Effect |
|-------------------|---------------|
| `length(v)` | Circular glow (Euclidean) |
| `abs(v.x) + abs(v.y)` | Diamond shapes (Manhattan) |
| `max(abs(v.x), abs(v.y))` | Square shapes (Chebyshev) |

---

### 4. Cosine Color Palettes

Inigo Quilez's famous technique for smooth, looping gradients.

```glsl
col = cos(i + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0;
```

**How it works:**
- Cosine naturally oscillates between -1 and 1
- Adding phase offsets (0, 1, 2, 3) shifts R, G, B, A channels
- Results in smooth color cycling through the spectrum

**General Formula (IQ Palette):**
```
color(t) = a + b · cos(2π(c·t + d))
```

Where:
- `a` = base color (offset)
- `b` = amplitude
- `c` = frequency
- `d` = phase shift per channel

**Examples:**
| `d` values | Result |
|------------|--------|
| `vec3(0.0, 0.33, 0.67)` | Rainbow |
| `vec3(0.0, 0.1, 0.2)` | Warm sunset |
| `vec3(0.5, 0.5, 0.5)` | Grayscale |

---

### 5. tanh Tone Mapping

High dynamic range compression for vibrant, saturated output.

```glsl
fragColor = tanh(col * col);
```

**Purpose:**
- Shader accumulates potentially infinite brightness
- Need to compress to displayable [0, 1] range
- `tanh` is a smooth sigmoid that preserves color ratios

**Why square first (`col * col`)?**
- Exaggerates bright areas (exponential contrast)
- Creates more "punchy" highlights
- Similar to gamma correction in photography

**Comparison:**
| Method | Effect |
|--------|--------|
| `clamp(col, 0, 1)` | Hard cutoff, loses detail |
| `col / (col + 1)` | Reinhard, gentle rolloff |
| `tanh(col)` | Smooth, preserves saturation |
| `tanh(col * col)` | High contrast + saturation |

---

## 📐 Coordinate System

```glsl
vec2 p = (gl_FragCoord.xy * 2.0 - iResolution) / iResolution.y / iZoom;
```

**Breakdown:**
1. `gl_FragCoord.xy` — Pixel position (0 to width/height)
2. `* 2.0 - iResolution` — Center at origin (-res to +res)
3. `/ iResolution.y` — Normalize by height (aspect-correct)
4. `/ iZoom` — Scale factor (smaller = zoomed out)

**Result:** Coordinate system where:
- Center of screen = (0, 0)
- Vertical range = approximately -3 to +3 (when zoom = 0.3)
- Aspect ratio preserved

---

## 🔗 References

- [Inigo Quilez - Domain Warping](https://iquilezles.org/articles/warp/)
- [Inigo Quilez - Palettes](https://iquilezles.org/articles/palettes/)
- [The Book of Shaders](https://thebookofshaders.com/)
- [Shadertoy](https://www.shadertoy.com/)

## 📜 Credits

Original "Rocaille" shader concept by [@XorDev](https://x.com/XorDev).

---

## 📄 License

MIT License - Feel free to use, modify, and share!
