// app data
var app = {};
app.meshes = {};
app.models = {};
app.texture = {};
app.programs = {};

// load 3D data into main memory
window.onload = function (){
    OBJ.downloadMeshes({
        'monkey' : 'model/suzanne.obj',
        'box' : 'model/box.obj',
    }, main);
}

// mouse interaction data
var mouseDragging = false;
var xDragPrev = 0.0;
var xDrag = 0.0;
const dragOffset = 0.1;
const canvas = document.querySelector('#glcanvas');;
canvas.addEventListener("mousedown", function(evt){
    mouseDragging = true;
    xDragPrev = evt.clientX;
}, false);
canvas.addEventListener("mousemove", function(evt){
    if(mouseDragging) {
    	if(evt.clientX > xDragPrev) {
    		xDrag -= dragOffset;
    	} else if(evt.clientX < xDragPrev) {
    		xDrag += dragOffset;
    	}
    	xDragPrev = evt.clientX;
    }
}, false);

canvas.addEventListener("mouseup", function(){
    mouseDragging = false;
}, false);

// general uniforms
const boxTransf = glMatrix.mat4.create();
const monkeyTransf = glMatrix.mat4.create();
const viewTransf = glMatrix.mat4.create();
const projectionTransf = glMatrix.mat4.create();
const cameraPosition = glMatrix.vec3.create();
var iorRatio;

setProjection();

var useReflectShader = true;
const normalMatrix = glMatrix.mat4.create();

function swapShader() {
	useReflectShader = useReflectShader ? false : true;
}

/***********
MAIN FUNCTION
************/

function main(meshes){
    app.meshes = meshes;
    
    // init GPU stuff
    const gl = initGL();
    initBuffers(gl);
    app.programs.skyboxShader = initShader(gl, skyboxShader);
    app.programs.monkeyReflectShader = initShader(gl, monkeyReflectShader);
    app.programs.monkeyRefractShader = initShader(gl, monkeyRefractShader);

    setUpCubeMap(gl);

    // Draw the scene repeatedly
    function render() {
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawScene(gl, app.models.box);
        drawScene(gl, app.models.monkey);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

/***********
INIT SECTION
************/

function initGL() {
    const gl = canvas.getContext('webgl');

    // If we don't have a GL context, give up now
    if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
    }

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    return gl;    
}

function initBuffers(gl){
    // initialize the mesh's buffers
    for (var mesh in app.meshes){
        OBJ.initMeshBuffers(gl, app.meshes[mesh]);
        // this loops through the mesh names and creates new
        // model objects and setting their mesh to the current mesh
        app.models[mesh] = {};
        app.models[mesh].mesh = app.meshes[mesh];
    }
}

function initShader(gl, programSource){
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, programSource.vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, programSource.fsSource);


    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        alert("Could not initialise shaders");
        alert(gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vrtxPositionAttribute = gl.getAttribLocation(shaderProgram, "vrtxPosition");
    shaderProgram.normalVectorAttribute = gl.getAttribLocation(shaderProgram, "normalVector");

    shaderProgram.monkeyTransf = gl.getUniformLocation(shaderProgram, 'monkeyTransf');
    shaderProgram.boxTransf = gl.getUniformLocation(shaderProgram, 'boxTransf');
    shaderProgram.viewTransf = gl.getUniformLocation(shaderProgram, 'viewTransf');
    shaderProgram.projectionTransform = gl.getUniformLocation(shaderProgram, 'projectionTransf');
    shaderProgram.cameraPosition = gl.getUniformLocation(shaderProgram, 'cameraPosition');
    shaderProgram.normalMatrix = gl.getUniformLocation(shaderProgram, 'normalMatrix');
    shaderProgram.iorRation = gl.getUniformLocation(shaderProgram, 'iorRatio');

    return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/***********
DRAW SECTION
************/

function drawScene(gl, model){

    if(model === app.models.monkey){
        if(useReflectShader) {
            gl.useProgram(app.programs.monkeyReflectShader);
            setupGPUData(gl, model, app.programs.monkeyReflectShader);

        } else {
            gl.useProgram(app.programs.monkeyRefractShader);
            setupGPUData(gl, model, app.programs.monkeyRefractShader);
        }
    }
    else if(model === app.models.box){
        gl.useProgram(app.programs.skyboxShader);
        setupGPUData(gl, model, app.programs.skyboxShader);
    }

    // draw triangles, defined by the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

function setupGPUData(gl, model, program) {
	updateUniforms();

	//refraction ratio
    gl.uniform1f(program.iorRation, iorRatio);

	// transfer transforms
	gl.uniformMatrix4fv(program.boxTransf, false, boxTransf);
    gl.uniformMatrix4fv(program.monkeyTransf, false, monkeyTransf);
    gl.uniformMatrix4fv(program.viewTransf, false, viewTransf);
	gl.uniformMatrix4fv(program.projectionTransform, false, projectionTransf);

	//camera Transforms
    gl.uniform3fv(program.cameraPosition, cameraPosition);
    gl.uniformMatrix4fv(program.normalMatrix, false, normalMatrix);

	// activate vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);
    gl.vertexAttribPointer(program.vrtxPositionAttribute, model.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.vrtxPositionAttribute);

	// activate normal vector buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.normalBuffer);
    gl.vertexAttribPointer(program.normalVectorAttribute, model.mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.normalVectorAttribute);
}

function updateUniforms() {
	updateBoxTransform();
	updateMonkeyTransform();
	updateView();
    updateIorRatio();

	// calculate normal matrix:
	glMatrix.mat4.identity(normalMatrix);
	glMatrix.mat4.invert(normalMatrix, boxTransf);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

	// calculate camera position
	const pos = glMatrix.vec3.create();
	const viewInverse = glMatrix.mat4.create();
	glMatrix.mat4.invert(viewInverse, viewTransf);
	glMatrix.vec3.transformMat4(cameraPosition, pos, viewInverse);
}

function updateIorRatio(){
    var waterRefraction = 1/1.33;
    var diamondRefraction = 1/2.417;

    iorRatio = diamondRefraction;
}

function updateBoxTransform() {
    glMatrix.mat4.identity(boxTransf);
    //transform:
    glMatrix.mat4.scale(boxTransf, boxTransf, [10,10,10]);
}
function updateMonkeyTransform() {
    glMatrix.mat4.identity(monkeyTransf);
    //transform:
    glMatrix.mat4.scale(monkeyTransf, monkeyTransf, [0.8,0.8,0.8]);
}

function updateView() {
	glMatrix.mat4.identity(viewTransf);

	glMatrix.mat4.translate(viewTransf, viewTransf, [0.0, 0.0, -3.0]);
	glMatrix.mat4.rotateY(viewTransf, viewTransf, xDrag);
}

function setProjection() {
  	const fieldOfView = 45 * Math.PI / 180;   // in radians
  	const aspect = canvas.width / canvas.height;
  	const zNear = 0.1;
  	const zFar = 100.0;
  	const projectionMatrix = glMatrix.mat4.create();

   	glMatrix.mat4.perspective(projectionTransf,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);
}

function setUpCubeMap(gl) {
    const cube_images = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: 'model/skybox/right.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: 'model/skybox/left.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: 'model/skybox/top.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: 'model/skybox/bottom.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: 'model/skybox/front.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: 'model/skybox/back.jpg',
        },
    ];

    app.texture.cubemap = createCubeMap(gl, cube_images);
}

function createCubeMap(gl, images) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    images.forEach((faceInfo) => {
        const {target, url} = faceInfo;

        // Upload the canvas to the cubemap face.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 2048; // beware: image resolution here
        const height = 2048;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // setup each face so it's immediately renderable
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        // Asynchronously load an image
        const image = new Image();
        image.src = url;
        image.addEventListener('load', function() {
            // Now that the image has loaded make copy it to the texture.
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    return texture;
}
