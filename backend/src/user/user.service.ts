import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor() {}

  getUser(id: string) {
    return {
      id: '1',
      username: 'user1',
      password: 'password1',
      email: '  ',
    };
  }
}
