import { Writable } from 'stream';

import { SaxEvents } from '../enums/events.enum';
import { SaxState } from '../enums/states.enum';
import { SaxTag } from '../enums/tags.enum';

export class SaxStream extends Writable {
  private state = SaxState.TEXT;
  private buffer = '';
  private pos = 0;
  private tagType = SaxTag.NONE;

  _write(chunk, encoding, done) {
    chunk = typeof chunk !== 'string' ? chunk.toString() : chunk;

    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      const prev = this.buffer[this.pos - 1];
      this.buffer += c;
      this.pos++;

      switch (this.state) {
        case SaxState.TEXT:
          if (c === '<') this.onStartNewTag();
          break;

        case SaxState.TAG_NAME:
          if (prev === '<' && c === '?') {
            this.onStartInstruction();
          }

          if (prev === '<' && c === '/') {
            this.onCloseTagStart();
          }

          if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '[') {
            this.onCDATAStart();
          }

          if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '-') {
            this.onCommentStart();
          }

          if (c === '>') {
            if (prev === '/') {
              this.tagType = SaxTag.SELF_CLOSING;
            }
            this.onTagCompleted();
          }
          break;

        case SaxState.INSTRUCTION:
          if (prev === '?' && c === '>') {
            this.onEndInstruction();
          }
          break;

        case SaxState.CDATA:
          if (this.buffer[this.pos - 3] === ']' && prev === ']' && c === '>') {
            this.onCDATAEnd();
          }
          break;

        case SaxState.IGNORE_COMMENT:
          if (this.buffer[this.pos - 3] === '-' && prev === '-' && c === '>') {
            this.onCommentEnd();
          }
          break;
      }
    }
    done();
  }

  private endRecording() {
    const rec = this.buffer.slice(1, this.pos - 1);
    this.buffer = this.buffer.slice(-1); // Keep last item in buffer for prev comparison in main loop.
    this.pos = 1; // Reset the position (since the buffer was reset)
    return rec;
  }

  private onStartNewTag() {
    const text = this.endRecording().trim();
    if (text) {
      this.emit(SaxEvents.TEXT, text);
    }
    this.state = SaxState.TAG_NAME;
    this.tagType = SaxTag.OPENING;
  }

  private onTagCompleted() {
    const tag = this.endRecording();

    const _parseTagString2 = this.parseTagString(tag),
      name = _parseTagString2.name,
      attributes = _parseTagString2.attributes;

    if (name === null) {
      this.emit(
        SaxEvents.ERROR,
        new Error('Failed to parse name for tag' + tag),
      );
    }

    if (this.tagType && this.tagType == SaxTag.OPENING) {
      this.emit(SaxEvents.OPEN_TAG, name, attributes);
    }

    if (this.tagType && this.tagType === SaxTag.CLOSING) {
      this.emit(SaxEvents.CLOSE_TAG, name, attributes);
    }
    if (this.tagType && this.tagType === SaxTag.SELF_CLOSING) {
      if (
        Object.keys(attributes).length === 0 &&
        attributes.constructor === Object
      ) {
        //attributes = { ___selfClosing___: true };
      }
      this.emit(SaxEvents.OPEN_TAG, name, attributes);
      this.emit(SaxEvents.CLOSE_TAG, name, attributes);
    }

    this.state = SaxState.TEXT;
    this.tagType = SaxTag.NONE;
  }

  private onCloseTagStart() {
    this.endRecording();
    this.tagType = SaxTag.CLOSING;
  }

  private onStartInstruction() {
    this.endRecording();
    this.state = SaxState.INSTRUCTION;
  }

  private onEndInstruction() {
    this.pos -= 1; // Move position back 1 step since instruction ends with '?>'
    const inst = this.endRecording();

    const _parseTagString3 = this.parseTagString(inst),
      name = _parseTagString3.name,
      attributes = _parseTagString3.attributes;

    if (name === null) {
      this.emit(
        SaxEvents.ERROR,
        new Error('Failed to parse name for inst' + inst),
      );
    }

    this.emit(SaxEvents.INSTRUCTION, name, attributes);
    this.state = SaxState.TEXT;
  }

  private onCDATAStart() {
    this.endRecording();
    this.state = SaxState.CDATA;
  }

  private onCDATAEnd() {
    let text = this.endRecording(); // Will return CDATA[XXX] we regexp out the actual text in the CDATA.
    text = text.slice(text.indexOf('[') + 1, text.lastIndexOf(']>') - 1);
    this.state = SaxState.TEXT;

    this.emit(SaxEvents.CDATA, text);
  }

  private onCommentStart() {
    this.state = SaxState.IGNORE_COMMENT;
  }

  private onCommentEnd() {
    this.endRecording();
    this.state = SaxState.TEXT;
  }

  private parseTagString(str) {
    let name;
    const parsedString = /^([a-zäöüßÄÖÜA-Z0-9:_\-.\/]+?)(\s|$)/.exec(str);

    if (parsedString && parsedString.length > 0) {
      name = parsedString[1];
      const attributesString = str.substr(name.length);
      const attributeRegexp = /([a-zäöüßÄÖÜA-Z0-9:_\-.]+?)="([^"]+?)"/g;
      let match = attributeRegexp.exec(attributesString);
      const attributes = {};
      while (match != null) {
        attributes[match[1]] = match[2];
        match = attributeRegexp.exec(attributesString);
      }

      if (name[name.length - 1] === '/') {
        name = name.substr(0, name.length - 1);
      }

      return { name: name, attributes: attributes };
    }
    return { name: null, attributes: {} };
  }
}
