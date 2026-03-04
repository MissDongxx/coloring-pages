import type { DimensionConfig } from './types';

export const dinosaurConfig: DimensionConfig = {
    root: 'dinosaur',
    dimensions: {
        character: [
            't-rex',
            'triceratops',
            'stegosaurus',
            'brachiosaurus',
            'pterodactyl',
            'velociraptor',
            'baby dinosaur'
        ],
        style: [
            'cute',
            'cartoon',
            'kawaii',
            'realistic',
            'simple',
            'easy',
            'detailed',
            'mandala style'
        ],
        scene: [
            'in jungle',
            'with volcano',
            'eating leaves',
            'hatching from egg',
            'running',
            'sleeping'
        ],
        audience: [
            'for kids',
            'for toddlers',
            'for preschool',
            'for adults'
        ]
    },
    patterns: [
        "{style} {character} {scene}",
        "{style} {character} {audience}",
        "{character} {scene} {audience}",
        "detailed {character} {scene} {root}",
        "{style} {root} {audience}",
        "{root} {character} {scene}"
    ]
};
