/**
 * Interactive Shader Playground
 * Based on "Rocaille" shader by @XorDev
 */

const vertexShaderSource = `#version 300 es
in vec4 aPosition;
void main() {
    gl_Position = aPosition;
}
`;

// Shader generator function - creates fragment shader for each variation
function generateFragmentShader(variation) {
    // Common header
    const header = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float iSpeed;
uniform float iZoom;
uniform float iWarpStrength;
uniform float iGlowSharpness;
uniform float iColorPhase;
uniform float iIterations;

out vec4 fragColor;

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - iResolution) / iResolution.y / iZoom;
    vec4 col = vec4(0.0);
    float t = iTime * iSpeed;
`;

    // Variation-specific loop logic
    let loopCode;

    switch (variation) {
        case 'rocaille':
            // Original Rocaille - swirling plasma
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        for (float f = 1.0; f < 10.0; f++) {
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(length(v), iGlowSharpness);
    }
`;
            break;

        case 'liquid':
            // Liquid Oil - smoother, broader shapes
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        // Single frequency wave instead of multi-frequency
        v += sin(v.yx * 3.0 + i + t) * 0.5 / iWarpStrength;
        v += sin(v.yx * 1.5 + i + t) * 0.3 / iWarpStrength;
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(length(v), iGlowSharpness);
    }
`;
            break;

        case 'electric':
            // Electric Grid - Manhattan distance creates diamond shapes
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        for (float f = 1.0; f < 10.0; f++) {
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        // Manhattan distance instead of Euclidean
        float dist = abs(v.x) + abs(v.y);
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(dist, iGlowSharpness);
    }
`;
            break;

        case 'kaleidoscope':
            // Kaleidoscope - symmetrical mandala patterns
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = abs(p); // Force symmetry
        for (float f = 1.0; f < 10.0; f++) {
            v = abs(v); // Maintain symmetry each iteration
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(length(v), iGlowSharpness);
    }
`;
            break;

        case 'alien':
            // Alien Biome - rainbow IQ palette
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        for (float f = 1.0; f < 10.0; f++) {
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        // IQ palette: a + b*cos(6.28318*(c*t+d))
        vec3 pal = 0.5 + 0.5 * cos(6.28318 * (0.5 * i + iColorPhase + vec3(0.0, 0.33, 0.67)));
        col.rgb += pal / pow(length(v), iGlowSharpness) / 6.0;
        col.a += 1.0 / pow(length(v), iGlowSharpness) / 6.0;
    }
`;
            break;

        default:
            loopCode = loopCode || '';
    }

    // Common footer with tone mapping
    const footer = `
    fragColor = tanh(col * col);
}
`;

    return header + loopCode + footer;
}

class ShaderPlayground {
    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl2');

        if (!this.gl) {
            alert('WebGL2 is required but not supported.');
            return;
        }

        // Default parameter values
        this.params = {
            variation: 'rocaille',
            speed: 1.0,
            zoom: 0.3,
            warpStrength: 1.0,
            glowSharpness: 1.0,
            colorPhase: 0.0,
            iterations: 10.0
        };

        this.startTime = performance.now();
        this.program = null;
        this.uniforms = {};

        this.initGeometry();
        this.buildShader(this.params.variation);
        this.setupControls();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.render();
    }

    initGeometry() {
        const gl = this.gl;

        // Fullscreen quad (only needs to be done once)
        const positions = new Float32Array([
            -1, -1, 1, -1, -1, 1, 1, 1,
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    buildShader(variation) {
        const gl = this.gl;

        // Delete old program if exists
        if (this.program) {
            gl.deleteProgram(this.program);
        }

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return;
        }

        // Compile fragment shader for selected variation
        const fragmentSource = generateFragmentShader(variation);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            console.log('Source:', fragmentSource);
            return;
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        // Re-bind position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const aPosition = gl.getAttribLocation(this.program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        // Cache uniform locations
        this.uniforms = {
            iResolution: gl.getUniformLocation(this.program, 'iResolution'),
            iTime: gl.getUniformLocation(this.program, 'iTime'),
            iSpeed: gl.getUniformLocation(this.program, 'iSpeed'),
            iZoom: gl.getUniformLocation(this.program, 'iZoom'),
            iWarpStrength: gl.getUniformLocation(this.program, 'iWarpStrength'),
            iGlowSharpness: gl.getUniformLocation(this.program, 'iGlowSharpness'),
            iColorPhase: gl.getUniformLocation(this.program, 'iColorPhase'),
            iIterations: gl.getUniformLocation(this.program, 'iIterations'),
        };

        console.log(`Shader variation "${variation}" compiled successfully.`);
    }

    setupControls() {
        // Variation dropdown - triggers shader recompile
        const variationSelect = document.getElementById('variation');
        variationSelect.addEventListener('change', (e) => {
            this.params.variation = e.target.value;
            this.buildShader(this.params.variation);
        });

        // All sliders - just update params
        const sliders = {
            speed: 'speed',
            zoom: 'zoom',
            warpStrength: 'warpStrength',
            glowSharpness: 'glowSharpness',
            colorPhase: 'colorPhase',
            iterations: 'iterations'
        };

        for (const [id, param] of Object.entries(sliders)) {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    this.params[param] = parseFloat(e.target.value);
                });
            }
        }
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000;

        // Update all uniforms
        gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.iTime, time);
        gl.uniform1f(this.uniforms.iSpeed, this.params.speed);
        gl.uniform1f(this.uniforms.iZoom, this.params.zoom);
        gl.uniform1f(this.uniforms.iWarpStrength, this.params.warpStrength);
        gl.uniform1f(this.uniforms.iGlowSharpness, this.params.glowSharpness);
        gl.uniform1f(this.uniforms.iColorPhase, this.params.colorPhase);
        gl.uniform1f(this.uniforms.iIterations, this.params.iterations);

        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(() => this.render());
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new ShaderPlayground();
});
