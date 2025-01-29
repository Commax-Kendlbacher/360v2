import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

let scene, camera, renderer;
let initialAlpha = 0, initialBeta = 0, initialGamma = 0;
let isCalibrated = false;

let quaternion = new THREE.Quaternion(); // Quaternion für Rotation
let smoothQuaternion = new THREE.Quaternion(); // Geglättete Rotation

let orientationMode = 'portrait'; // 'portrait' oder 'landscape'

// Funktion zur Quaternion-Glättung
function applyQuaternionSmoothing(current, target, smoothingFactor = 0.1) {
    return current.slerp(target, smoothingFactor); // Smoother Übergang
}

// Debugging-Funktion
function debugOrientation(yaw, pitch, roll) {
    console.log(`Yaw: ${yaw.toFixed(2)} rad, Pitch: ${pitch.toFixed(2)} rad, Roll: ${roll.toFixed(2)} rad`);
}

function handleOrientation(event) {
    if (!isCalibrated) {
        initialAlpha = event.alpha || 0;
        initialBeta = event.beta || 0;
        initialGamma = event.gamma || 0;
        isCalibrated = true;
    }

    let yaw, pitch, roll;

    if (orientationMode === 'portrait') {
        yaw = THREE.MathUtils.degToRad((event.alpha || 0) - initialAlpha);
        pitch = THREE.MathUtils.degToRad((event.beta || 0) - initialBeta) * -1; // Invertiere Pitch
        roll = THREE.MathUtils.degToRad((event.gamma || 0) - initialGamma);

        if (event.beta > 90) {
            pitch = Math.PI - pitch; // Passe Pitch an, wenn das Gerät auf dem Kopf ist
            yaw += Math.PI; // Passe Yaw entsprechend an
        }
    } else {
        yaw = THREE.MathUtils.degToRad((event.alpha || 0) - initialAlpha);
        pitch = THREE.MathUtils.degToRad((event.gamma || 0) - initialGamma) * -1; // Invertiere Pitch
        roll = THREE.MathUtils.degToRad((event.beta || 0) - initialBeta);

        if (event.gamma > 90) {
            pitch = Math.PI - pitch;
            yaw += Math.PI;
        }
    }

    // Begrenze Pitch (Hoch-/Runterschauen) dynamisch
    const maxPitch = Math.PI / 2 - 0.3; // Verhindere, dass der Pitch zu nah an die obere Grenze kommt
    const minPitch = -Math.PI / 2 + 0.3;

    const clampedPitch = Math.max(Math.min(pitch, maxPitch), minPitch);

    // Debugging-Ausgabe
    debugOrientation(yaw, clampedPitch, roll);

    // Erstelle eine neue Quaternion basierend auf Yaw, Pitch und Roll
    quaternion.setFromEuler(new THREE.Euler(clampedPitch, yaw, -roll, 'YXZ'));

    // Glätte die Quaternion
    smoothQuaternion = applyQuaternionSmoothing(smoothQuaternion, quaternion);
    camera.quaternion.copy(smoothQuaternion); // Setze die Kamerarotation
}

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('test.jpg', () => {
        console.log('Texture loaded successfully!');
    });

    const geometry = new THREE.SphereGeometry(500, 128, 128);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    window.addEventListener('deviceorientation', handleOrientation);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('startButton').addEventListener('click', () => {
    if (window.innerWidth > window.innerHeight) {
        orientationMode = 'landscape'; // Querformat
    } else {
        orientationMode = 'portrait'; // Hochformat
    }

    console.log(`Orientation detected: ${orientationMode}`);

    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then((permissionState) => {
                if (permissionState === 'granted') {
                    init();
                    animate();
                    document.getElementById('startButton').style.display = 'none';
                } else {
                    alert('Permission denied for motion sensors.');
                }
            })
            .catch(console.error);
    } else {
        init();
        animate();
        document.getElementById('startButton').style.display = 'none';
    }
});
