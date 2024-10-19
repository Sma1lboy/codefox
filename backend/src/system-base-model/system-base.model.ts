import { Field, ObjectType } from '@nestjs/graphql';
import { CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

@ObjectType()
export class SystemBaseModel {
  @Field()
  @CreateDateColumn()
  created_at: Date;

  @Field()
  @UpdateDateColumn()
  last_updated: Date;

  @Field()
  @Column({ default: true })
  is_active: boolean;

  @Field()
  @Column({ default: false })
  is_deleted: boolean;
}
