import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', (type) => Date)
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: number): Date {
    return new Date(value); // value from the client
  }

  serialize(value: unknown): number {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
      console.log(value);
      console.log(
        `Expected a Date object or a value that can be converted to a Date, but got: ${typeof value}`,
      );
      throw new TypeError(
        `Expected a Date object or a convertible value, but got: ${typeof value}`,
      );
    }

    if (isNaN(date.getTime())) {
      console.log(value);
      console.log('Invalid date value provided.');
      throw new TypeError('Invalid date value provided.');
    }

    return date.getTime();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
    return null;
  }
}
