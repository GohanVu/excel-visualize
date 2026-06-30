import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export class UpdatePlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
