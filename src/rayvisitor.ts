import Matrix from './matrix';
import Vector from './vector';
import Sphere from './sphere';
import Intersection from './intersection';
import Ray from './ray';
import Visitor from './visitor';
import phong from './phong';
import {
    Node, GroupNode, SphereNode,
    AABoxNode, TextureBoxNode, CameraNode, PyramidNode
} from './nodes';
import AABox from './aabox';

const UNIT_SPHERE = new Sphere(new Vector(0, 0, 0, 1), 1, new Vector(0, 0, 0, 1));
const UNIT_AABOX = new AABox(new Vector(-0.5, -0.5, -0.5, 1), new Vector(0.5, 0.5, 0.5, 1), new Vector(0, 0, 0, 1));

/**
 * Class representing a Visitor that uses
 * Raytracing to render a Scenegraph
 */
export default class RayVisitor implements Visitor {
    /**
     * The image data of the context to
     * set individual pixels
     */
    imageData: ImageData;
    matrixStack: Matrix[];
    inverseStack: Matrix[];
    intersection: Intersection | null;
    intersectionColor: Vector;
    ray: Ray;

    /**
     * Creates a new RayVisitor
     * @param context The 2D context to render to
     * @param width The width of the canvas
     * @param height The height of the canvas
     */
    constructor(private context: CanvasRenderingContext2D, width: number, height: number) {
        this.imageData = context.getImageData(0, 0, width, height);
    }

    /**
     * Renders the Scenegraph
     * @param rootNode The root node of the Scenegraph
     * @param camera The camera used
     * @param lightPositions The light light positions
     */
    render(
        rootNode: Node,
        camera: { origin: Vector, width: number, height: number, alpha: number },
        lightPositions: Array<Vector>
    ) {
        // clear
        let data = this.imageData.data;
        data.fill(0);

        // raytrace
        const width = this.imageData.width;
        const height = this.imageData.height;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.ray = Ray.makeRay(x, y, camera);

                //MatrixStacks hier immer neu leeren, damit firefox nicht crasht
                this.matrixStack = [];
                this.inverseStack = [];

                this.matrixStack.push(Matrix.identity());
                this.inverseStack.push(Matrix.identity());
                this.intersection = null;
                rootNode.accept(this);

                if (this.intersection) {
                    if (!this.intersectionColor) {
                        data[4 * (width * y + x) + 0] = 0;
                        data[4 * (width * y + x) + 1] = 0;
                        data[4 * (width * y + x) + 2] = 0;
                        data[4 * (width * y + x) + 3] = 255;
                    } else {
                        let color = phong(this.intersectionColor, this.intersection, lightPositions, 10, camera.origin);
                        data[4 * (width * y + x) + 0] = color.r * 255;
                        data[4 * (width * y + x) + 1] = color.g * 255;
                        data[4 * (width * y + x) + 2] = color.b * 255;
                        data[4 * (width * y + x) + 3] = 255;
                    }
                }
            }
        }
        this.context.putImageData(this.imageData, 0, 0);
    }

    /**
     * Visits a group node
     * @param node The node to visit
     */
    visitGroupNode(node: GroupNode) {
        //Stack pushen
        this.matrixStack.push(this.matrixStack[this.matrixStack.length - 1].mul(node.transform.getMatrix()));
        this.inverseStack.push(node.transform.getInverseMatrix().mul(this.inverseStack[this.inverseStack.length - 1]));

        //jedes children accepten lassen -> ruft bei group-node wieder visitGroupNode auf (rekursiv quasi)
        node.childNodes.forEach(node => node.accept(this)); //lambda-Ausdruck von Array

        this.matrixStack.pop();
        this.inverseStack.pop();
    }

    /**
     * Visits a sphere node
     * @param node - The node to visit
     */
    visitSphereNode(node: SphereNode) {
        let toWorld = this.matrixStack[this.matrixStack.length - 1];
        let fromWorld = this.inverseStack[this.inverseStack.length - 1];

        const ray = new Ray(fromWorld.mulVec(this.ray.origin), fromWorld.mulVec(this.ray.direction).normalize());
        let intersection = UNIT_SPHERE.intersect(ray);

        if (intersection) {
            const intersectionPointWorld = toWorld.mulVec(intersection.point);
            const intersectionNormalWorld = toWorld.mulVec(intersection.normal).normalize();
            intersection = new Intersection(
                (intersectionPointWorld.x - ray.origin.x) / ray.direction.x,
                intersectionPointWorld,
                intersectionNormalWorld
            );
            if (this.intersection === null || intersection.closerThan(this.intersection)) {
                this.intersection = intersection;
                this.intersectionColor = node.color;
            }
        }
    }

    /**
     * Visits an axis aligned box node
     * @param node The node to visit
     */
    visitAABoxNode(node: AABoxNode) {
        let toWorld = this.matrixStack[this.matrixStack.length - 1];
        let fromWorld = this.inverseStack[this.inverseStack.length - 1];

        const ray = new Ray(fromWorld.mulVec(this.ray.origin), fromWorld.mulVec(this.ray.direction).normalize());
        let intersection = UNIT_AABOX.intersect(ray);

        if (intersection) {
            const intersectionPointWorld = toWorld.mulVec(intersection.point);
            const intersectionNormalWorld = toWorld.mulVec(intersection.normal).normalize();
            intersection = new Intersection(
                (intersectionPointWorld.x - ray.origin.x) / ray.direction.x,
                intersectionPointWorld,
                intersectionNormalWorld
            );
            if (this.intersection === null || intersection.closerThan(this.intersection)) {
                this.intersection = intersection;
                this.intersectionColor = node.color;
            }
        }
    }

    /**
     * Visits a textured box node
     * @param node The node to visit
     */
    visitTextureBoxNode(node: TextureBoxNode) {
    }

    visitCameraNode(node: CameraNode): void {}

    visitPyramidNode(node: PyramidNode): void {
    }
}