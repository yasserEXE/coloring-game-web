export interface ImageItem {
  src: string;
  category: 'animals' | 'vehicles' | 'stories';
}

export const images: ImageItem[] = [
  // stories
  { src: 'story_1.png', category: 'stories' },
  { src: 'story_2.png', category: 'stories' },
  { src: 'story_3.png', category: 'stories' },
  { src: 'story_4.png', category: 'stories' },
  { src: 'story_5.png', category: 'stories' },

  // vehicles
  { src: 'car.png', category: 'vehicles' },
  { src: 'car_2.png', category: 'vehicles' },
  { src: 'carr.png', category: 'vehicles' },
  { src: 'carrr.png', category: 'vehicles' },

  // animals (and others)
  { src: 'baby_tiger.png', category: 'animals' },
  { src: 'bear.png', category: 'animals' },
  { src: 'bunny.png', category: 'animals' },
  { src: 'cat.png', category: 'animals' },
  { src: 'cat_2.png', category: 'animals' },
  { src: 'dinsour.png', category: 'animals' },
  { src: 'girrafe.png', category: 'animals' },
  { src: 'girrafes.png', category: 'animals' },
  { src: 'kwala.png', category: 'animals' },
  { src: 'kwala_2.png', category: 'animals' },
  { src: 'sea_creatures.png', category: 'animals' },
  { src: 'tawoos.png', category: 'animals' },
  { src: 'turtle.png', category: 'animals' },
  { src: 'zoo.png', category: 'animals' },
  { src: 'flowers.png', category: 'animals' },
  { src: 'fungi.png', category: 'animals' },
  { src: 'girl_playing.png', category: 'animals' },
];
