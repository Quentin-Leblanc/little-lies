import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { MeshStandardMaterial } from 'three';
import * as THREE from 'three';

export const Map = () => {
    const { scene } = useGLTF('/models/map2.glb');

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh) {

                child.castShadow = true; // Assurez-vous que l'objet projette des ombres
                child.receiveShadow = true; // Assurez-vous que l'objet reçoit des ombres
            }
        });
    }, [scene]);

    return (
        <RigidBody colliders="trimesh"  type="fixed" position={[0, -0.1, 0]}>
            <primitive object={scene} />
        </RigidBody>
    );
};

useGLTF.preload('/models/map2.glb');
