import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CameraFollow = ({ playerPosition }) => {
    const cameraRef = useRef();

    useFrame(({ camera }) => {

        cameraRef.current = camera;
    });

    return null;  // If you just want the camera to be freely controlled, return null.
};

export default CameraFollow;
