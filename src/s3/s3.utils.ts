import { S3 } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export const uploadFileToS3 = async (
  s3: S3,
  file: Express.Multer.File,
  bucketName: string
): Promise<string> => {
  const fileName = `${uuidv4()}-${file.originalname}`;
  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Error uploading file to S3');
  }
  return `https://${bucketName}.s3.amazonaws.com/${fileName}`;
};
