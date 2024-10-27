import { Injectable } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { RequireRoles } from './decorator/auth.decorator';

@Resolver()
export class AppResolver {
  @Query(() => String)
  @RequireRoles('Admin')
  getHello(): string {
    return 'Hello World!';
  }
}
