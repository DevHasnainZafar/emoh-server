import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  firstName: string | null;

  @ApiProperty()
  lastName: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  defaultCurrencyName: string;

  @ApiProperty()
  defaultCurrencyCode: string;

  @ApiProperty()
  defaultLanguage: string;

  @ApiProperty()
  isProfileCreated: boolean;

  @ApiProperty()
  profilePic: string | null;

  @ApiProperty()
  accessToken?: string;
}