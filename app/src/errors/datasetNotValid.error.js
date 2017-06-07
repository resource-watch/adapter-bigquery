
class DatasetNotValid extends Error {

    constructor(message) {
        super(message);
        this.name = 'DatasetNotValid';
        this.message = message;
    }

}

module.exports = DatasetNotValid;
