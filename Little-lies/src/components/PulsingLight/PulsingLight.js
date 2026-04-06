import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BLOOM_LAYER } from '../../utils/constants';

const PulsingLight = ({ position, color }) => {
    const lightRef = useRef();
    const pulseSpeed = 2; // Speed of the pulse effect

    useFrame(({ clock }) => {
        const elapsedTime = clock.getElapsedTime();
        if (lightRef.current) {
            lightRef.current.intensity = 5 + Math.sin(elapsedTime * pulseSpeed) * 2; // Adjust intensity range for better effect
        }
    });

    return (
        <spotLight
            ref={lightRef}
            position={position}
            angle={0.7}
            penumbra={1}
            intensity={5} // Base intensity
            distance={40}
            color={color}
            layers={BLOOM_LAYER} // Ensure it's on the Bloom Layer for glow effect
            castShadow
        />
        
    );
};

export default PulsingLight;
