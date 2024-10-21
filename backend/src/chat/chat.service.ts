import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatMessage } from './chat.model';

@Injectable()
export class ChatProxyService {
  private readonly logger = new Logger('chat-service');
  constructor(private httpService: HttpService) {}

  streamChat(input: string): Observable<ChatMessage> {
    this.logger.debug('request chat input: ' + input);
    return new Observable<ChatMessage>((observer) => {
      this.httpService
        .post(
          'http://localhost:3001/chat/completion',
          {
            content: input,
          },
          {
            responseType: 'stream',
          },
        )
        .subscribe(
          (response) => {
            response.data.on('data', (chunk: Buffer) => {
              this.logger.debug('chunk: ' + chunk.toString());
              observer.next({ content: chunk.toString() });
            });
            response.data.on('end', () => {
              observer.complete();
            });
          },
          (error) => observer.error(error),
        );
    });
  }
}
