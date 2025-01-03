import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { LoginUserInput } from 'src/user/dto/login-user.input';
import { RegisterUserInput } from 'src/user/dto/register-user.input';
import { User } from 'src/user/user.model';
import { In, Repository } from 'typeorm';
import { CheckTokenInput } from './dto/check-token.input';
import { JwtCacheService } from 'src/auth/jwt-cache.service';
import { Menu } from './menu/menu.model';
import { Role } from './role/role.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private jwtCacheService: JwtCacheService,
    private configService: ConfigService,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async register(registerUserInput: RegisterUserInput): Promise<User> {
    const { username, email, password } = registerUserInput;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    return this.userRepository.save(newUser);
  }

  async login(
    loginUserInput: LoginUserInput,
  ): Promise<{ accessToken: string }> {
    const { username, password } = loginUserInput;

    const user = await this.userRepository.findOne({
      where: [{ username: username }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);
    this.jwtCacheService.storeToken(accessToken);

    return { accessToken };
  }

  async validateToken(params: CheckTokenInput): Promise<boolean> {
    try {
      await this.jwtService.verifyAsync(params.token);
      return this.jwtCacheService.isTokenStored(params.token);
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async logout(token: string): Promise<boolean> {
    Logger.log('logout token', token);
    try {
      await this.jwtService.verifyAsync(token);
    } catch (error) {
      return false;
    }

    if (!(await this.jwtCacheService.isTokenStored(token))) {
      return false;
    }
    this.jwtCacheService.removeToken(token);
    return true;
  }

  async assignMenusToRole(roleId: string, menuIds: string[]): Promise<Role> {
    // Find the role with existing menus
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['menus'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    // Find all menus
    const menus = await this.menuRepository.findByIds(menuIds);

    if (menus.length !== menuIds.length) {
      throw new NotFoundException('Some menus were not found');
    }

    if (!role.menus) {
      role.menus = [];
    }

    const newMenus = menus.filter(
      (menu) => !role.menus.some((existingMenu) => existingMenu.id === menu.id),
    );

    if (newMenus.length === 0) {
      throw new ConflictException(
        'All specified menus are already assigned to this role',
      );
    }

    role.menus.push(...newMenus);

    try {
      await this.roleRepository.save(role);
      Logger.log(
        `${newMenus.length} menus assigned to role ${role.name} successfully`,
      );

      return await this.roleRepository.findOne({
        where: { id: roleId },
        relations: ['menus'],
      });
    } catch (error) {
      Logger.error(`Failed to assign menus to role: ${error.message}`);
      throw error;
    }
  }

  async removeMenuFromRole(roleId: string, menuId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['menus'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    const menuIndex = role.menus?.findIndex((menu) => menu.id === menuId);

    if (menuIndex === -1) {
      throw new NotFoundException(
        `Menu with ID "${menuId}" not found in role "${role.name}"`,
      );
    }

    role.menus.splice(menuIndex, 1);

    try {
      await this.roleRepository.save(role);
      Logger.log(`Menu removed from role ${role.name} successfully`);

      return await this.roleRepository.findOne({
        where: { id: roleId },
        relations: ['menus'],
      });
    } catch (error) {
      Logger.error(`Failed to remove menu from role: ${error.message}`);
      throw error;
    }
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const roles = await this.roleRepository.findBy({ id: In(roleIds) });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('Some roles were not found');
    }

    if (!user.roles) {
      user.roles = [];
    }

    const newRoles = roles.filter(
      (role) => !user.roles.some((existingRole) => existingRole.id === role.id),
    );

    if (newRoles.length === 0) {
      throw new ConflictException(
        'All specified roles are already assigned to this user',
      );
    }

    user.roles.push(...newRoles);

    try {
      await this.userRepository.save(user);
      Logger.log(
        `${newRoles.length} roles assigned to user ${user.username} successfully`,
      );

      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
    } catch (error) {
      Logger.error(`Failed to assign roles to user: ${error.message}`);
      throw error;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const roleIndex = user.roles?.findIndex((role) => role.id === roleId);

    if (roleIndex === -1) {
      throw new NotFoundException(
        `Role with ID "${roleId}" not found in user's roles`,
      );
    }

    user.roles.splice(roleIndex, 1);

    try {
      await this.userRepository.save(user);
      Logger.log(`Role removed from user ${user.username} successfully`);

      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
    } catch (error) {
      Logger.error(`Failed to remove role from user: ${error.message}`);
      throw error;
    }
  }

  async getUserRolesAndMenus(userId: string): Promise<{
    roles: Role[];
    menus: Menu[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.menus'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const userRoles = user.roles || [];

    // Get unique menus across all roles
    const userMenus = Array.from(
      new Map(
        userRoles
          .flatMap((role) => role.menus || [])
          .map((menu) => [menu.id, menu]),
      ).values(),
    );

    return {
      roles: userRoles,
      menus: userMenus,
    };
  }

  async getUserRoles(userId: string): Promise<{
    roles: Role[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return {
      roles: user.roles || [],
    };
  }

  async getUserMenus(userId: string): Promise<{
    menus: Menu[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.menus'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const userMenus = Array.from(
      new Map(
        (user.roles || [])
          .flatMap((role) => role.menus || [])
          .map((menu) => [menu.id, menu]),
      ).values(),
    );

    return {
      menus: userMenus,
    };
  }
}
