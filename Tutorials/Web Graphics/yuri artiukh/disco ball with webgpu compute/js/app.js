import * as THREE from "three/webgpu";
import {REVISION} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {vec4,vec3,Fn,uv,texture,uniform,min,mix,normalLocal,floor,mul,positionLocal,pass,overlay,refract,positionWorld,cameraPosition,normalize,length,screenUV,normalWorld,vec2,textureBicubic,float,negate,smoothstep,sin,cos,mat4,div,mat3,hash,atan2,acos,modelWorldMatrix,transformedNormalWorld,cameraProjectionMatrix,cameraViewMatrix,Loop,instancedArray, instanceIndex,attribute} from 'three/tsl'
import GUI from 'lil-gui'; 
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import gsap from "gsap";
import ball from "../MBall.glb?url";
import cube from "../MCube.glb?url";
import envmap from "../env.jpg?url";


export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGPURenderer({
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1); 

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      1000
    );

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // let frustumSize = 10;
    // let aspect = this.width / this.height;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`
    this.dracoLoader = new DRACOLoader( new THREE.LoadingManager() ).setDecoderPath( `${THREE_PATH}/examples/jsm/libs/draco/gltf/` );
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.isPlaying = true;
    
    this.loadAssets().then(() => {
      this.addObjects();
      this.resize();
      this.render();
      this.setupResize();
      // this.setUpSettings();
    });
  }

  createBackgroundWithVignette() {
    // Create a background material with vignette effect
    const backgroundMaterial = new THREE.MeshBasicNodeMaterial();
    
    backgroundMaterial.colorNode = Fn(() => {
      const backgroundColor = vec3(0.791, 0.592, 0.998);
      
      const uv = screenUV;
      
      // Convert UV to centered coordinates (-1 to 1)
      const centeredUV = uv.mul(2.0).sub(1.0);
      
      // Calculate distance from center
      const distanceFromCenter = length(centeredUV);
      
      // Create vignette effect
      const vignette = smoothstep(0.3, 1.4, distanceFromCenter);
      
      // Mix background color with darker color for vignette
      const vignetteColor = vec3(1.000, 0.396, 0.914);
      const finalColor = mix(backgroundColor, vignetteColor, vignette);
      
      return finalColor;
    })();
    
    // Create a sphere geometry that will serve as background
    const backgroundGeometry = new THREE.SphereGeometry(500, 32, 32);
    backgroundGeometry.scale(-1, 1, 1); // Invert to see from inside
    
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.scene.add(backgroundMesh);
  }

  loadAssets() {
    // Create texture loader for environment map
    const textureLoader = new THREE.TextureLoader();
    
    // Load GLB models
    const loadBall = new Promise((resolve, reject) => {
      this.gltfLoader.load(ball, resolve, undefined, reject);
    });
    
    const loadCube = new Promise((resolve, reject) => {
      this.gltfLoader.load(cube, resolve, undefined, reject);
    });
    
    // Load environment map
    const loadEnvMap = new Promise((resolve, reject) => {
      textureLoader.load(envmap, resolve, undefined, reject);
    });
    
    // Load all assets using Promise.all
    return Promise.all([loadBall, loadCube, loadEnvMap])
      .then(([ballGltf, cubeGltf, envTexture]) => {
        console.log('All assets loaded successfully!');
        
        // Store loaded assets for use in other methods
        this.ballModel = ballGltf.scene;
        this.cubeModel = cubeGltf.scene;
        this.envTexture = envTexture;
        
        // Set up environment map
        this.envTexture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = this.envTexture;
        
        // Create background with vignette
        this.createBackgroundWithVignette();
        
        console.log('Ball model:', this.ballModel);
        console.log('Cube model:', this.cubeModel);
        console.log('Environment texture:', this.envTexture);
      })
      .catch((error) => {
        console.error('Error loading assets:', error);
      });
  }

  setUpSettings() {
    this.settings = {
      progress: 0,
    };
    this.gui = new GUI();
    this.gui.add(this.settings, "progress", 0, 1, 0.01).onChange((val)=>{})
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    const time = uniform(0);
    this.time = time;
    console.log(this.ballModel);
    console.log(this.cubeModel);
    let numberOfParticles = this.ballModel.children[0].geometry.attributes.position.count;
    let number = numberOfParticles;
    let cubePositions = this.ballModel.children[0].geometry.attributes.position.array;
    let ringPositions = this.ballModel.children[0].geometry.attributes._ringid.array;

    // this.scene.add(this.cubeModel);
    // this.cubeModel.children[0].material = new THREE.MeshPhysicalNodeMaterial({
    //   roughness: 0.1,
    //   metalness: 1,
    // });
    let geo = this.cubeModel.children[0].geometry;
    geo.scale(0.04,0.02,0.042)
    geo.rotateY(Math.PI/2)
    geo.rotateZ(Math.PI/2)

    let totalPointsData = new Float32Array(numberOfParticles * 3);
    let ringData = new Float32Array(numberOfParticles);
    for(let i = 0; i < numberOfParticles; i++){
      totalPointsData[i * 3 + 0] = cubePositions[i * 3 + 0];
      totalPointsData[i * 3 + 1] = cubePositions[i * 3 + 1];
      totalPointsData[i * 3 + 2] = cubePositions[i * 3 + 2];
      ringData[i] = ringPositions[i];
    }

    let geos = []
    for(let i = 0; i < numberOfParticles; i++){
      let currentGeo = geo.clone();
      // currentGeo.translate(cubePositions[i * 3 + 0], cubePositions[i * 3 + 1], cubePositions[i * 3 + 2])
      let index = i;
      let len =currentGeo.attributes.position.count;
      let indexArray = new Float32Array(len).fill(index);
      currentGeo.setAttribute('fboIndex', new THREE.BufferAttribute(indexArray, 1));  
      geos.push(currentGeo)
    }
    let mergedGeo = BufferGeometryUtils.mergeGeometries(geos);
    let mergedMaterial = new THREE.MeshPhysicalNodeMaterial({
      roughness: 0.4,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    let mergedMesh = new THREE.Mesh(mergedGeo, mergedMaterial);
    this.scene.add(mergedMesh);





    
    const mousePosition = uniform(new THREE.Vector3(0));
    this.mousePosition = mousePosition;


    const positions = instancedArray(totalPointsData, 'vec3');
    const ringDataArray = instancedArray(ringData, 'float');
    const velocities = instancedArray(number, 'vec3');


    this.computeUpdate = Fn(()=>{
      const position = positions.element(instanceIndex);
      const ringData = ringDataArray.element(instanceIndex);
      const distance = position.xy.sub(mousePosition.xy).length();
      const distanceFactor = smoothstep(0, 0.5, distance).oneMinus();

      let randomSpeed = sin(floor(ringData.mul(1130033)).add(1231)).add(1).mul(0.5);
      let randomNumber = hash(instanceIndex);
      const angle = float(0.001).add(randomSpeed.mul(0.002));
      const rotationMatrix = mat3(
        vec3(cos(angle), 0, sin(angle)),
        vec3(0, 1, 0), 
        vec3(negate(sin(angle)), 0, cos(angle))
      );
      position.assign(position.mul(rotationMatrix));

      const originalPosition = position.toVar().normalize()


      let target = float(1);
      const sineAddition = sin(randomNumber.mul(7).add(time)).add(1).mul(0.5);
      const sineAdditionSmall = sin(randomNumber.mul(127).add(time)).add(1).mul(.01);
      
      target = min(float(1.2),float(1).add(distanceFactor.mul(sineAddition)))
      target.addAssign(sineAdditionSmall);
      position.assign(
        mix(position, originalPosition.toVar().mul(target) ,0.07)
      )

      // position.addAssign(vec3(ringData.mul(0.001),0,0.0))

    })().compute(number)





    const lookAt = Fn(([position,target])=>{
      const localUp = vec3(0,1,0);
      const forward = target.sub(position).normalize();
      const right = forward.cross(localUp).normalize();
      const up = right.cross(forward).normalize();
      const rotation = mat3(right, up, forward);
      return rotation;
    })
    mergedMaterial.positionNode = Fn(()=>{
      const pos = positionLocal.toVar();
      const referenceIndex = attribute('fboIndex');
      const updatedPos = positions.element(referenceIndex);

      const rotationMatrix = lookAt(updatedPos.xyz,vec3(0,0,0));
      pos.xyz = rotationMatrix.mul(pos.xyz);
      pos.addAssign(updatedPos);

      return pos;
    })()


    mergedMaterial.colorNode = Fn(()=>{
      const referenceIndex = attribute('fboIndex');
      const updatedPos = positions.element(referenceIndex);
      const color = updatedPos.xyz.mul(0.5).add(0.5);
      const localNormal = normalLocal.toVar();

      const rotationMatrix = lookAt(updatedPos.xyz,vec3(0,0,0));
      const rotatedNormal = rotationMatrix.mul(localNormal).normalize();

      const steps = float(10.);
      const quantizedNormal = rotatedNormal.mul(steps).floor().div(steps).normalize();

             const envMap = texture(this.scene.environment);
      
      // Convert normal to spherical UV coordinates
      const uv = vec2(
        atan2(quantizedNormal.z, quantizedNormal.x).mul(0.5).div(Math.PI).add(0.5),
        acos(quantizedNormal.y).div(Math.PI)
      );
      
      const envColor = envMap.sample(uv);
      return envColor;


    })()



    
    
    





    // MOUSE INTERACTION
    // ================================
    // ================================
    let plane = new THREE.PlaneGeometry(4, 4, 1, 1);
    let planeMaterial = new THREE.MeshBasicNodeMaterial({
      color: 0x0000ff,
    });
    this.plane = new THREE.Mesh(plane, planeMaterial);
    // this.scene.add(this.plane);
    // MOUSE INTERACTION
    this.container.addEventListener('mousemove', (e)=>{
      this.mouse.x = (e.clientX / this.width) * 2 - 1;
      this.mouse.y = -(e.clientY / this.height) * 2 + 1;

      // raycast on plane
      this.raycaster.setFromCamera(this.mouse, this.camera);
      let intersects = this.raycaster.intersectObjects([this.plane]);
      if(intersects.length > 0){
        this.mousePosition.value.copy(intersects[0].point);
        // console.log(this.mousePosition.value);
      }

    })

  }

  render() {
    this.time.value += 0.001;
    requestAnimationFrame(this.render.bind(this));
    this.renderer.compute(this.computeUpdate);
    this.renderer.renderAsync(this.scene, this.camera);
    
  }
}

new Sketch({
  dom: document.getElementById("container")
});
