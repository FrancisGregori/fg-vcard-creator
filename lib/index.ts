import { Property, DefinedElements } from './types'
import VCardException from './utils/VCardException'

import { b64encode, chunkSplit, fold, isValidMimeType } from './utils/functions'

export default class VCard {
  public charset = 'utf-8'

  private contentType = 'text/x-vcard'

  private filename = 'vcard'

  private fileExtension = 'vcf'

  private properties: Property[] = []

  private definedElements: DefinedElements = {}

  private multiplePropertiesForElementAllowed: string[] = [
    'email',
    'address',
    'phoneNumber',
    'url',
    'item',
  ]

  private useVCalendar = false

  public constructor(format: 'vcard' | 'vcalendar' = 'vcard') {
    if (format === 'vcalendar') {
      this.setFormat(format)
    }
  }

  public setFormat(format: 'vcard' | 'vcalendar' = 'vcard'): void {
    if (format === 'vcalendar') {
      this.contentType = 'text/x-vcalendar'
      this.useVCalendar = true
    } else if (format === 'vcard') {
      this.contentType = 'text/x-vcard'
      this.useVCalendar = false
    }
  }

  public addAddress(
    name = '',
    extended = '',
    street = '',
    city = '',
    region = '',
    zip = '',
    country = '',
    type = 'WORK;POSTAL',
  ): this {
    const value = `\
${name};${extended};${street};${city};${region};${zip};${country}\
`
    this.setProperty(
      'address',
      `ADR${type !== '' ? `;${type}` : ''}${this.getCharsetString()}`,
      value,
    )

    return this
  }

  public addBirthday(date: string): this {
    this.setProperty('birthday', 'BDAY', date)

    return this
  }

  public addCompany(company: string, department = ''): this {
    this.setProperty(
      'company',
      `ORG${this.getCharsetString()}`,
      company + (department !== '' ? `;${department}` : ''),
    )

    return this
  }

  public addEmail(address: string, type = ''): this {
    this.setProperty(
      'email',
      `EMAIL;INTERNET${type !== '' ? `;${type}` : ''}`,
      address,
    )

    return this
  }

  public addJobTitle(jobTitle: string): this {
    this.setProperty('jobtitle', `TITLE${this.getCharsetString()}`, jobTitle)

    return this
  }

  public addRole(role: string): this {
    this.setProperty('role', `ROLE${this.getCharsetString()}`, role)

    return this
  }

  private addMediaURL(property: string, url: string, element: string): this {
    this.setProperty(element, `${property};VALUE=uri`, url)

    return this
  }

  private addMediaContent(
    property: string,
    content: string,
    mime: string,
    element: string,
  ): this {
    if (!isValidMimeType(mime)) {
      throw new VCardException(`The MIME Media Type is invalid (${mime})`)
    }

    this.setProperty(
      element,
      `${property};ENCODING=b;TYPE=${mime.toUpperCase()}`,
      content,
    )

    return this
  }

  public addName(
    lastName = '',
    firstName = '',
    additional = '',
    prefix = '',
    suffix = '',
  ): this {
    // Define values with non-empty values
    const values = [prefix, firstName, additional, lastName, suffix].filter(
      (m) => !!m,
    )

    const property = `\
${lastName};${firstName};${additional};${prefix};${suffix}\
`
    this.setProperty('name', `N${this.getCharsetString()}`, property)
    // Is property FN set?
    if (!this.hasProperty('FN')) {
      this.setProperty(
        'fullname',
        `FN${this.getCharsetString()}`,
        values.join(' ').trim(),
      )
    }

    return this
  }

  public addNote(note: string): this {
    this.setProperty('note', `NOTE${this.getCharsetString()}`, note)

    return this
  }

  public addCategories(categories: string[]): this {
    this.setProperty(
      'categories',
      `CATEGORIES${this.getCharsetString()}`,
      categories.join(',').trim(),
    )

    return this
  }

  public addPhoneNumber(number: number, type = ''): this {
    this.setProperty(
      'phoneNumber',
      `TEL${type !== '' ? `;${type}` : ''}`,
      `${number}`,
    )

    return this
  }

  public addLogoURL(url: string): this {
    this.addMediaURL('LOGO', url, 'logo')

    return this
  }

  public addLogo(image: string, mime = 'JPEG'): this {
    this.addMediaContent('LOGO', image, mime, 'logo')

    return this
  }

  public addPhotoURL(url: string): this {
    this.addMediaURL('PHOTO', url, 'photo')

    return this
  }

  public addPhoto(image: string, mime = 'JPEG'): this {
    this.addMediaContent('PHOTO', image, mime, 'photo')

    return this
  }

  public addURLItem(url: string, label = '', index = ''): this {
    this.setProperty('item', `item${index}.URL`, url)
    this.setProperty('item', `item${index}.X-ABLabel`, label)

    return this
  }

  public buildVCard(): string {
    const now = new Date()

    let string = ''
    string += 'BEGIN:VCARD\r\n'
    string += 'VERSION:3.0\r\n'
    string += `REV:${now.toISOString()}\r\n`

    // Loop all properties
    const properties = this.getProperties()
    properties.forEach((property) => {
      string += fold(`${property.key}:${escape(property.value)}\r\n`)
    })

    string += 'END:VCARD\r\n'

    return string
  }

  public buildVCalendar(): string {
    const nowISO = new Date().toISOString()
    const nowBase = nowISO.replace(/-/g, '').replace(/:/g, '').substring(0, 13)
    const dtstart = `${nowBase}00`
    const dtend = `${nowBase}01`

    const b64vcard = b64encode(this.buildVCard())
    const b64mline = chunkSplit(b64vcard, 74, '\n')
    const b64final = b64mline.replace(/(.+)/g, ' $1')

    const string = `\
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;TZID=Europe/London:${dtstart}
DTEND;TZID=Europe/London:${dtend}
SUMMARY:Click the attachment to save to your contacts
DTSTAMP:${dtstart}Z
ATTACH;VALUE=BINARY;ENCODING=BASE64;FMTTYPE=text/directory;
 X-APPLE-FILENAME=${this.getFilename()}.${this.getFileExtension()}:
${b64final}\
END:VEVENT
END:VCALENDAR
`

    return string
  }

  public toString(): string {
    return this.getOutput()
  }

  public getCharset(): string {
    return this.charset
  }

  public getCharsetString(): string {
    let charsetString = ''

    if (this.charset === 'utf-8') {
      charsetString = `;CHARSET=${this.charset}`
    }

    return charsetString
  }

  public getContentType(): string {
    return this.contentType
  }

  public getFilename(): string {
    return this.filename
  }

  public getFileExtension(): string {
    return this.fileExtension
  }

  public getOutput(): string {
    return this.useVCalendar ? this.buildVCalendar() : this.buildVCard()
  }

  public getProperties(): Property[] {
    return this.properties
  }

  public hasProperty(key: string): boolean {
    const pproperties = this.getProperties()
    // eslint-disable-next-line consistent-return
    pproperties.forEach((property: Property) => {
      if (property.key === key && property.value !== '') {
        return true
      }
    })

    return false
  }

  public setCharset(charset: string): void {
    this.charset = charset
  }

  public setFilename(value: string): void {
    if (!value) {
      return
    }

    this.filename = value
  }

  public setProperty(element: string, key: string, value: string): void {
    if (
      this.multiplePropertiesForElementAllowed.indexOf(element) < 0 &&
      this.definedElements[element]
    ) {
      throw new VCardException(`This element already exists (${element})`)
    }

    this.definedElements[element] = true

    this.properties.push({
      key,
      value,
    })
  }
}
