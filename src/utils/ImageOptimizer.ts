import sharp from 'sharp';

const optimizeImage = async (imagePath: string) => {
  const image = await sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Optimizar la imagen
  const optimizedImage = await image.resize(width / 2, height / 2);
  await optimizedImage.toFormat('jpeg', { quality: 80 });
  await optimizedImage.toFile('optimized-image.jpg');
};

export default optimizeImage;