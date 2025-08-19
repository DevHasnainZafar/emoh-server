import { PartialType } from "@nestjs/swagger";
import { CreateProfileDto } from "./createProfile.dto";

 export class UpdateProfileDto extends PartialType(CreateProfileDto){}