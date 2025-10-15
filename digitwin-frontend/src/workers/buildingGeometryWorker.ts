// Worker for generating building extrusions off the main thread
import * as THREE from 'three';

interface WorkerBuildingInput {
  footprint: [number, number][];
  height: number;
}

interface WorkerRequest {
  requestId: string;
  buildings: WorkerBuildingInput[];
}

interface WorkerBuildingOutput {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint32Array | Uint16Array | null;
}

interface WorkerResponse {
  requestId: string;
  buildings: WorkerBuildingOutput[];
}

const extrudeOptions: THREE.ExtrudeGeometryOptions = {
  depth: 1,
  bevelEnabled: true,
  bevelThickness: 0.5,
  bevelSize: 0.3,
  bevelSegments: 1,
};

const createShape = (footprint: [number, number][]) => {
  const shape = new THREE.Shape();
  if (footprint.length === 0) {
    return shape;
  }

  const [x0, z0] = footprint[0];
  shape.moveTo(x0, z0);
  for (let i = 1; i < footprint.length; i++) {
    const [x, z] = footprint[i];
    shape.lineTo(x, z);
  }
  shape.lineTo(x0, z0);
  return shape;
};

const generateGeometry = (building: WorkerBuildingInput): WorkerBuildingOutput | null => {
  const { footprint, height } = building;
  if (footprint.length < 3 || height <= 0) {
    return null;
  }

  const shape = createShape(footprint);
  const geometry = new THREE.ExtrudeGeometry(
    shape,
    {
      ...extrudeOptions,
      depth: height,
    },
  );

  const bufferGeometry = geometry.toNonIndexed();
  bufferGeometry.computeVertexNormals();

  const positionAttr = bufferGeometry.getAttribute('position');
  const normalAttr = bufferGeometry.getAttribute('normal');
  const uvAttr = bufferGeometry.getAttribute('uv');

  const positions = positionAttr ? new Float32Array(positionAttr.array) : new Float32Array();
  const normals = normalAttr ? new Float32Array(normalAttr.array) : new Float32Array();
  const uvs = uvAttr ? new Float32Array(uvAttr.array) : null;

  const indexAttr = geometry.getIndex();
  let indices: Uint32Array | Uint16Array | null = null;
  if (indexAttr) {
    const array = indexAttr.array;
    if (Array.isArray(array)) {
      const typed = array.length > 65535 ? new Uint32Array(array) : new Uint16Array(array);
      indices = typed;
    } else if (array instanceof Uint32Array || array instanceof Uint16Array) {
      const typedArray = array as Uint32Array | Uint16Array;
      indices = (typedArray.constructor === Uint32Array
        ? new Uint32Array(typedArray)
        : new Uint16Array(typedArray)) as Uint32Array | Uint16Array;
    }
  }

  geometry.dispose();
  bufferGeometry.dispose();

  return {
    positions,
    normals,
    uvs,
    indices,
  };
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, buildings } = event.data;
  const start = performance.now();
  const outputs: WorkerBuildingOutput[] = [];
  const transfer: ArrayBuffer[] = [];

  buildings.forEach((building) => {
    const result = generateGeometry(building);
    if (!result) {
      outputs.push({
        positions: new Float32Array(),
        normals: new Float32Array(),
        uvs: null,
        indices: null,
      });
      return;
    }

    outputs.push(result);
    transfer.push(result.positions.buffer, result.normals.buffer);
    if (result.uvs) {
      transfer.push(result.uvs.buffer);
    }
    if (result.indices) {
      transfer.push(result.indices.buffer);
    }
  });

  const response: WorkerResponse = {
    requestId,
    buildings: outputs,
  };

  (self as unknown as Worker).postMessage(response, transfer);
  const elapsed = (performance.now() - start).toFixed(1);
  console.log(`🏗️ Worker generated ${buildings.length} geometries in ${elapsed}ms (${requestId})`);
};

export {};
