import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

let scene, camera, renderer;
let isCalibrated = false;
let initialQuaternion = new THREE.Quaternion();
let smoothQuaternion = new THREE.Quaternion();

// Funktion zur Quaternion-Glättung
function applyQuaternionSmoothing(current, target, smoothingFactor = 0.1) {
    return current.slerp(target, smoothingFactor);
}

// Debugging-Funktion
function debugOrientation(pitch) {
    console.log(`Pitch: ${pitch.toFixed(2)} rad`);
}

function handleOrientation(event) {
    if (!isCalibrated) {
        // Initiale Quaternion basierend auf Sensorwerten setzen
        const initialEuler = new THREE.Euler(
            THREE.MathUtils.degToRad(event.beta || 0),
            THREE.MathUtils.degToRad(event.alpha || 0),
            THREE.MathUtils.degToRad(event.gamma || 0),
            'YXZ'
        );
        initialQuaternion.setFromEuler(initialEuler);
        isCalibrated = true;
        console.log('Calibration complete.');
    }

    // Aktuelle Quaternion aus den Sensorwerten berechnen
    const currentEuler = new THREE.Euler(
        THREE.MathUtils.degToRad(event.beta || 0),
        THREE.MathUtils.degToRad(event.alpha || 0),
        THREE.MathUtils.degToRad(event.gamma || 0),
        'YXZ'
    );
    const currentQuaternion = new THREE.Quaternion().setFromEuler(currentEuler);

    // Relativer Quaternion-Wert
    const relativeQuaternion = initialQuaternion.clone().invert().multiply(currentQuaternion);

    // Euler-Winkel aus relativer Quaternion extrahieren
    const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuaternion, 'YXZ');

    // Stabilisiere Pitch
    const maxPitch = Math.PI / 2 - 0.1; // Obergrenze (fast 90°)
    const minPitch = -Math.PI / 2 + 0.1; // Untergrenze (fast -90°)
    const pitch = Math.max(minPitch, Math.min(maxPitch, relativeEuler.x)); // Pitch begrenzen

    // Debugging: Überprüfe Pitch-Wert
    debugOrientation(pitch);

    // Aktualisiere Kamera-Quaternion
    const stabilizedQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitch, relativeEuler.y, relativeEuler.z, 'YXZ')
    );
    smoothQuaternion = applyQuaternionSmoothing(smoothQuaternion, stabilizedQuaternion);
    camera.quaternion.copy(smoothQuaternion);
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
    if (window.innerWidth <= window.innerHeight) {
        alert('Bitte legen Sie Ihr Gerät ins Querformat, um fortzufahren.');
        return;
    }

    console.log('Querformat erkannt.');

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
