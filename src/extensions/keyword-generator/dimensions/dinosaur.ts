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
        "{style} {character} {scene} coloring page",
        "{style} {character} coloring page {audience}",
        "{character} {scene} coloring page for kids",
        "detailed {character} {scene} {root} coloring page",
        "{style} {root} coloring page {audience}",
        "{root} {character} {scene} coloring pages"
    ]
};
