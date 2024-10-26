import { Field, ObjectType } from '@nestjs/graphql';
import { CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

@ObjectType()
export class SystemBaseModel {
  @Field()
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field()
  @Column({ default: false })
  isDeleted: boolean;
}
