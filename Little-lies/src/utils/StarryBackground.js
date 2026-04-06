import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Stars = () => {
    const starRef = useRef();

    // Utiliser useMemo pour générer la géométrie une seule fois
    const stars = useMemo(() => {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });

        // Générer les positions des étoiles
        const starVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = -Math.random() * 2000;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(starVertices, 3)
        );

        return new THREE.Points(starGeometry, starMaterial);
    }, []); // Le tableau vide [] assure que le calcul ne se fait qu'une seule fois

    // Animation de rotation des étoiles
    useFrame(() => {
        starRef.current.rotation.y += 0.0005; // Tourner lentement autour de l'axe Y
    });

    return <primitive ref={starRef} object={stars} />;
};

const StarryBackground = () => {
    return (
        <Canvas
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1, // Fond derrière le contenu
            }}
        >
            <ambientLight />
            <Stars />
        </Canvas>
    );
};

export default StarryBackground;
