class VCardException extends Error {
    constructor(params: string | undefined) {
        super(params)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, VCardException)
        }

        this.name = 'VCardException'
    }
}

export default VCardException
