const skyboxShader = {
    vsSource : `
        attribute vec4 vrtxPosition;
        attribute vec4 normalVector;

        uniform mat4 boxTransf;
        uniform mat4 viewTransf;
        uniform mat4 projectionTransf;
        uniform mat4 normalMatrix;

        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        varying vec3 v_normal;

        void main(void) {
            gl_Position = projectionTransf*viewTransf*boxTransf*vrtxPosition;
            
            worldPos = (boxTransf*vrtxPosition).xyz;
            normalWorld = (normalMatrix*normalVector).xyz;
            
            v_normal = normalize(vrtxPosition.xyz);
        }
  `,

    fsSource : `

        uniform highp vec3 cameraPosition;
        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        precision mediump float;
        uniform samplerCube u_texture;
        varying vec3 v_normal;    

        void main(void) {
          highp vec3 transformedNormal = normalize(normalWorld);
          highp vec3 viewDirection = normalize(cameraPosition-worldPos);

          gl_FragColor = textureCube(u_texture, normalize(v_normal));
        }
  `,
};

const monkeyReflectShader = {
    vsSource: `
    
        attribute vec4 vrtxPosition;
        attribute vec4 normalVector;

        uniform mat4 monkeyTransf;
        uniform mat4 viewTransf;
        uniform mat4 projectionTransf;
        uniform mat4 normalMatrix;

        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        varying vec3 v_normal;



        void main(void) {
            gl_Position = projectionTransf*viewTransf*monkeyTransf*vrtxPosition;
            
            worldPos = (monkeyTransf*vrtxPosition).xyz;
            normalWorld = (normalMatrix*normalVector).xyz;
            
            v_normal = normalize(vrtxPosition.xyz);
        }
  `,

    fsSource: `
    
        uniform highp vec3 cameraPosition;
        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        precision mediump float;
        uniform samplerCube u_texture;
        varying vec3 v_normal;            
        

        void main(void) {
          vec3 worldNormal = normalize(normalWorld);
          vec3 eyeToSurfaceDir = normalize(worldPos - cameraPosition);
          
          vec3 direction = reflect(eyeToSurfaceDir,worldNormal);

          gl_FragColor = textureCube(u_texture, direction);
        }
  `,
};
const monkeyRefractShader = {
    vsSource: `
    
        attribute vec4 vrtxPosition;
        attribute vec4 normalVector;

        uniform mat4 monkeyTransf;
        uniform mat4 viewTransf;
        uniform mat4 projectionTransf;
        uniform mat4 normalMatrix;

        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        varying vec3 v_normal;



        void main(void) {
            gl_Position = projectionTransf*viewTransf*monkeyTransf*vrtxPosition;
            
            worldPos = (monkeyTransf*vrtxPosition).xyz;
            normalWorld = (normalMatrix*normalVector).xyz;
            
            v_normal = normalize(vrtxPosition.xyz);
        }
  `,

    fsSource: `
    
        uniform highp vec3 cameraPosition;
        varying highp vec3 worldPos;
        varying highp vec3 normalWorld;
        
        precision mediump float;
        uniform samplerCube u_texture;
        varying vec3 v_normal;    
        
        uniform float iorRatio;        
        

        void main(void) {
          vec3 worldNormal = normalize(normalWorld);
          vec3 eyeToSurfaceDir = normalize(worldPos - cameraPosition);
          
          vec3 refractionR = refract(eyeToSurfaceDir, normalWorld, iorRatio+0.1);
          vec3 refractionG = refract(eyeToSurfaceDir, normalWorld, iorRatio+0.15);
          vec3 refractionB = refract(eyeToSurfaceDir, normalWorld, iorRatio+0.2);
          
          vec4 dispersionVec = vec4(0.0);
          dispersionVec.r = textureCube(u_texture, refractionR).r;
          dispersionVec.g = textureCube(u_texture, refractionG).g;
          dispersionVec.b = textureCube(u_texture, refractionB).b;
          dispersionVec.a = 1.0;

          gl_FragColor = dispersionVec;
          
          //textureCube(u_texture, refraction);
        }
  `,
};