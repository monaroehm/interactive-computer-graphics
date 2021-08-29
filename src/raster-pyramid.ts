import Vector from './vector';
import Shader from './shader';

/**
 * A class creating buffers for an axis aligned box to render it with WebGL
 */
export default class RasterPyramid {
    /**
     * The buffer containing the box's vertices
     */
    vertexBuffer: WebGLBuffer;
    /**
     * The indices describing which vertices form a triangle
     */
    indexBuffer: WebGLBuffer;
    // TODO private variable for color buffer
    colorBuffer: WebGLBuffer;
    /**
     * The amount of indices
     */
    elements: number;

    /**
     * Creates all WebGL buffers for the box
     *
     *
     *          4 (Spitze)
     *
     *      3 ------- 2
     *     /         /
     *   0 ------- 1
     *  looking in negative z axis direction
     * @param gl The canvas' context
     * @param minPoint The minimal x,y,z of the box
     * @param maxPoint The maximal x,y,z of the box
     */
    constructor(private gl: WebGL2RenderingContext, minPoint: Vector, maxPoint: Vector, color1?: Vector, color2?: Vector) {
        this.gl = gl;
        const mi = minPoint;
        const ma = maxPoint;
        let vertices = [
            mi.x, mi.y, ma.z,
            ma.x, mi.y, ma.z,
            ma.x, mi.y, mi.z,
            mi.x, mi.y, mi.z,
            (mi.x + ma.x)/2, ma.y, (mi.z + ma.z)/2
        ];
        let indices = [
            // front
            0, 1, 4,
            // back
            3, 2, 4,
            // right
            1, 2, 4,
            // left
            0, 3, 4,
            // bottom
            0, 1, 2, 2, 3, 0
        ];
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.vertexBuffer = vertexBuffer;
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.indexBuffer = indexBuffer;
        this.elements = indices.length;

        // TODO create and fill a buffer for colours
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        //https://webglfundamentals.org/webgl/lessons/webgl-how-it-works.html -> Strg+F "colorBuffer"
        // Pick 2 random colors.
        if(color1 === undefined){
            color1 = new Vector(Math.random(), Math.random(), Math.random(), 1);
        }

        if(color2 === undefined){
            color2 = new Vector(Math.random(), Math.random(), Math.random(), 1);
        }

        var r1 = color1.r;
        var b1 = color1.b;
        var g1 = color1.g;
        var a1 = color1.a;

        var r2 = color2.r;
        var b2 = color2.b;
        var g2 = color2.g;
        var a2 = color2.a;

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ r1, b1, g1, a1,
            r1, b1, g1, a1,
            r1, b1, g1, a1,
            r2, b2, g2, a2,
            r2, b2, g2, a2,
            r2, b2, g2, a2]), gl.STATIC_DRAW);
        this.colorBuffer = colorBuffer;
    }

    /**
     * Renders the box
     * @param shader The shader used to render
     */
    render(shader: Shader) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = shader.getAttributeLocation("a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation,
            3, this.gl.FLOAT, false, 0, 0);

        // TODO bind colour buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLocation = shader.getAttributeLocation("a_color");
        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.elements, this.gl.UNSIGNED_SHORT, 0);

        this.gl.disableVertexAttribArray(positionLocation);

        // TODO disable color vertex attrib array
        this.gl.disableVertexAttribArray(colorLocation);
    }
}