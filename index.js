const rpio = require('rpio');
let Service, Characteristic;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-rpio-button", "RpioButton", RpioButton);
};

function RpioButton(log, config) {
    this.log = log;
    this.name = config.name ? config.name : 'Rpio Button';
    this.pin = config.pin ? config.pin : 15; // GPIO 22
    this.state = false;
    this.preventTurnOff = config.preventTurnOff ? config.preventTurnOff : false;
    this.timeout = config.timeout ? config.timeout : 100;
    this.services = [];

    rpio.open(this.pin, rpio.OUTPUT);
    this.log(`Created button: ${this.name} on pin: ${this.pin}`);

    this.service = new Service.Switch(this.name);
    this.service.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this));

    this.serviceInfo = new Service.AccessoryInformation();
    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Raspberry');


    this.services.push(this.service);
    this.services.push(this.serviceInfo);
}


RpioButton.prototype = {
    getOn: function(callback) {
        this.log.debug(`Button PIN: ${this.pin} is ${this.state}`);
        callback(null, this.state);
    },
    setOn: function(state, callback) {
        this.log.debug(`Set button PIN: ${this.pin} to ${state}`);
        this.state = state;
        rpio.write(this.pin, state ? rpio.HIGH : rpio.LOW);
        if (state && !this.preventTurnOff) {
            setTimeout(() => {
                this.service.setCharacteristic(Characteristic.On, false);
            }, this.timeout);
        }
        callback(null);
    },
    getServices: function() {
        return this.services
    }
};
