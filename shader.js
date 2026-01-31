const vertexShaderSource = `#version 300 es
in vec4 aPosition;
void main() {
    gl_Position = aPosition;
}
`;

function generateFragmentShader(variation) {
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

    let loopCode;

    switch (variation) {
        case 'rocaille':
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
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        v += sin(v.yx * 3.0 + i + t) * 0.5 / iWarpStrength;
        v += sin(v.yx * 1.5 + i + t) * 0.3 / iWarpStrength;
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(length(v), iGlowSharpness);
    }
`;
            break;

        case 'electric':
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        for (float f = 1.0; f < 10.0; f++) {
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        float dist = abs(v.x) + abs(v.y);
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(dist, iGlowSharpness);
    }
`;
            break;

        case 'kaleidoscope':
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = abs(p);
        for (float f = 1.0; f < 10.0; f++) {
            v = abs(v);
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        col += (cos(i + iColorPhase + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / pow(length(v), iGlowSharpness);
    }
`;
            break;

        case 'alien':
            loopCode = `
    for (float i = 0.0; i < iIterations; i++) {
        vec2 v = p;
        for (float f = 1.0; f < 10.0; f++) {
            v += sin(v.yx * f + i + iResolution + t) / (f * iWarpStrength);
        }
        vec3 pal = 0.5 + 0.5 * cos(6.28318 * (0.5 * i + iColorPhase + vec3(0.0, 0.33, 0.67)));
        col.rgb += pal / pow(length(v), iGlowSharpness) / 6.0;
        col.a += 1.0 / pow(length(v), iGlowSharpness) / 6.0;
    }
`;
            break;

        default:
            loopCode = loopCode || '';
    }

    const footer = `
    vec4 result = tanh(col * col);
    fragColor = vec4(result.rgb, 1.0);
}
`;

    return header + loopCode + footer;
}

class ShaderPlayground {
    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl2', {
            preserveDrawingBuffer: true,
            alpha: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            alert('WebGL2 is required but not supported.');
            return;
        }

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

        this.isExporting = false;
        this.capturer = null;
        this.exportTime = 0;
        this.exportDuration = 0;
        this.exportFrameCount = 0;
        this.currentFrame = 0;

        this.initGeometry();
        this.buildShader(this.params.variation);
        this.setupControls();
        this.setupExport();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.render();
    }

    initGeometry() {
        const gl = this.gl;
        const positions = new Float32Array([
            -1, -1, 1, -1, -1, 1, 1, 1,
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    buildShader(variation) {
        const gl = this.gl;

        if (this.program) {
            gl.deleteProgram(this.program);
        }

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return;
        }

        const fragmentSource = generateFragmentShader(variation);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            return;
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const aPosition = gl.getAttribLocation(this.program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

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
    }

    setupControls() {
        this.setupToggle();

        const variationSelect = document.getElementById('variation');
        variationSelect.addEventListener('change', (e) => {
            this.params.variation = e.target.value;
            this.buildShader(this.params.variation);
        });

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

    setupToggle() {
        const controls = document.querySelector('.controls');
        const toggleBtn = document.getElementById('toggleBtn');
        const header = document.querySelector('.controls-header');

        const isCollapsed = localStorage.getItem('controlsCollapsed') === 'true';
        if (isCollapsed) {
            controls.classList.add('collapsed');
        }

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            controls.classList.toggle('collapsed');
            localStorage.setItem('controlsCollapsed', controls.classList.contains('collapsed'));
        });

        header.addEventListener('click', (e) => {
            if (e.target === header || e.target.classList.contains('controls-title')) {
                controls.classList.toggle('collapsed');
                localStorage.setItem('controlsCollapsed', controls.classList.contains('collapsed'));
            }
        });
    }

    setupExport() {
        const recordBtn = document.getElementById('recordBtn');
        const recordText = recordBtn.querySelector('.record-text');
        const recordInfo = document.getElementById('recordInfo');

        recordBtn.addEventListener('click', () => {
            if (this.isExporting) return;
            this.startExport(recordBtn, recordText, recordInfo);
        });
    }

    getLoopDuration() {
        return (2 * Math.PI) / this.params.speed;
    }

    startExport(button, textEl, infoEl) {
        const fps = 60;
        const loopDuration = this.getLoopDuration();
        this.exportFrameCount = Math.ceil(loopDuration * fps);
        this.exportDuration = loopDuration;
        this.currentFrame = 0;
        this.exportTime = 0;

        this.isExporting = true;
        button.classList.add('recording');
        button.disabled = true;
        textEl.textContent = 'Exporting...';
        infoEl.textContent = `0 / ${this.exportFrameCount} frames`;
        infoEl.classList.add('active');

        this.capturer = new CCapture({
            format: 'webm',
            framerate: fps,
            quality: 100,
            name: `shader_${this.params.variation}_${Date.now()}`,
            verbose: false
        });

        this.capturer.start();
        this.exportRender(button, textEl, infoEl);
    }

    exportRender(button, textEl, infoEl) {
        if (this.currentFrame >= this.exportFrameCount) {
            this.finishExport(button, textEl, infoEl);
            return;
        }

        const gl = this.gl;
        const fps = 60;
        const frameTime = this.currentFrame / fps;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.iTime, frameTime);
        gl.uniform1f(this.uniforms.iSpeed, this.params.speed);
        gl.uniform1f(this.uniforms.iZoom, this.params.zoom);
        gl.uniform1f(this.uniforms.iWarpStrength, this.params.warpStrength);
        gl.uniform1f(this.uniforms.iGlowSharpness, this.params.glowSharpness);
        gl.uniform1f(this.uniforms.iColorPhase, this.params.colorPhase);
        gl.uniform1f(this.uniforms.iIterations, this.params.iterations);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.capturer.capture(this.canvas);
        this.currentFrame++;

        const progress = Math.round((this.currentFrame / this.exportFrameCount) * 100);
        textEl.textContent = `Exporting ${progress}%`;
        infoEl.textContent = `${this.currentFrame} / ${this.exportFrameCount} frames`;

        requestAnimationFrame(() => this.exportRender(button, textEl, infoEl));
    }

    finishExport(button, textEl, infoEl) {
        textEl.textContent = 'Saving...';

        this.capturer.stop();
        this.capturer.save();

        setTimeout(() => {
            this.isExporting = false;
            button.classList.remove('recording');
            button.disabled = false;
            textEl.textContent = 'Export Video';
            infoEl.textContent = 'Download complete!';
            infoEl.classList.remove('active');

            this.startTime = performance.now();

            setTimeout(() => {
                infoEl.textContent = '';
            }, 3000);
        }, 500);
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
        if (this.isExporting) {
            requestAnimationFrame(() => this.render());
            return;
        }

        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.iTime, time);
        gl.uniform1f(this.uniforms.iSpeed, this.params.speed);
        gl.uniform1f(this.uniforms.iZoom, this.params.zoom);
        gl.uniform1f(this.uniforms.iWarpStrength, this.params.warpStrength);
        gl.uniform1f(this.uniforms.iGlowSharpness, this.params.glowSharpness);
        gl.uniform1f(this.uniforms.iColorPhase, this.params.colorPhase);
        gl.uniform1f(this.uniforms.iIterations, this.params.iterations);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(() => this.render());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ShaderPlayground();
});
