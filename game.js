; (function () {
    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        var screen = canvas.getContext('2d');
        this.gameSize = { x: canvas.width, y: canvas.height };

        this.isGameOver = false;
        var self = this;

        var drawSurface = function (landingPad, objs) {
            var step = canvas.width / 12;
            var ymax = canvas.height - 20;
            var ymin = canvas.height * 0.8;
            var y = ymin + Math.random() * (ymax - ymin);
            var surface = [];

            for (var x = 0; x < canvas.width; x += step) {
                var ynext = 0;
                var delta = canvas.height / 20;
                while (ynext < ymin || ynext > ymax) {

                    if (landingPad.x > x && landingPad.x < (x + step)) {
                        ynext = y;
                        landingPad.width = step - 4;
                        landingPad.y = y - 2;
                        landingPad.height = 3;
                        continue;
                    }
                    var r = Math.random();
                    if (r < 0.2) {
                        ynext = y + 3 * delta;
                    }
                    else if (r < 0.4) {
                        ynext = y + delta;
                    }
                    else if (r < 0.6) {
                        ynext = y - delta;
                    }
                    else if (r < 0.8) {
                        ynext = y + 3 * delta;
                    }
                    else {
                        ynext = y;
                    }
                }
                var segment = new SurfaceSegment(x, y, x + step, ynext);
                objs.push(segment);
                surface.push(segment);
                y = ynext;
            }
            return surface;
        };

        var tick = function () {
            self.update();
            if (self.isGameOver) {
                var metric = screen.measureText(self.gameOverMsgs[0]);
                screen.fillText(self.gameOverMsgs[0], self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 + (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 0.8);
                if (self.gameOverMsgs.length > 1) {
                    var metric = screen.measureText(self.gameOverMsgs[1]);
                    screen.fillText(self.gameOverMsgs[1], self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 - (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 0.8);
                }

                var metric = screen.measureText("Press any key to play again");
                screen.fillText("Press any key to play again", self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 - (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 5.6);

                window.onkeydown = function (e) {
                    new Game("screen");
                }

                return;
            }
            self.draw(screen, self.gameSize);
            requestAnimationFrame(tick);
        }

        this.landingPad = new LandingPad((2 + Math.round(Math.random() * 8)) * (this.gameSize.x / 12) + 2);
        this.objs = [this.landingPad];
        this.surface = drawSurface(this.landingPad, this.objs);
        this.ship = new Ship(this);
        this.objs.push(this.ship);
        tick();
    };

    // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
    function intersects(l1, l2) {
        var det, gamma, lambda;
        det = (l1.x2 - l1.x1) * (l2.y2 - l2.y1) - (l2.x2 - l2.x1) * (l1.y2 - l1.y1);
        if (det === 0) {
            return false;
        } else {
            lambda = ((l2.y2 - l2.y1) * (l2.x2 - l1.x1) + (l2.x1 - l2.x2) * (l2.y2 - l1.y1)) / det;
            gamma = ((l1.y1 - l1.y2) * (l2.x2 - l1.x1) + (l1.x2 - l1.x1) * (l2.y2 - l1.y1)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    };

    Game.prototype = {
        update: function () {
            this.objs.forEach(obj => obj.update());
        },

        draw: function (screen, size) {
            screen.clearRect(0, 0, size.x, size.y);
            screen.beginPath();
            screen.moveTo(0, 0);
            screen.lineTo(0, size.y);
            screen.lineTo(size.x, size.y);
            screen.lineTo(size.x, 0);
            screen.closePath();
            screen.stroke();
            screen.fillText("Thrust: " + Math.round(10000 * this.ship.thrust), 10, 10);
            screen.fillText("Angle: " + Math.round(this.ship.angle / Math.PI * 180), 10, 20);
            screen.fillText("Fuel: " + Math.round(this.ship.fuel), 10, 30);
            this.objs.forEach(obj => obj.draw(screen));
        },

        outOfBounds: function (x, y, w, h) {
            return x < 0 || y < 0 || (x + w) > this.gameSize.x || (y + h) > this.gameSize.y;
        },


        touchingSurface: function (x, y, w, h) {
            var shipLineSegment = { x1: x, y1: y, x2: x + w, y2: y + h };
            var touching = this.surface.filter((segment) => {
                return intersects(shipLineSegment, segment);
            });
            return touching.length > 0;

        },

        touchingLandingPad: function (x, y, w, h) {
            var shipLineSegment = { x1: x, y1: y, x2: x + w, y2: y + h };
            return intersects(shipLineSegment,
                {
                    x1: this.landingPad.x,
                    y1: this.landingPad.y - this.landingPad.height,
                    x2: this.landingPad.x + this.landingPad.width,
                    y2: this.landingPad.y - this.landingPad.height
                });

        },

        win: function () {
            this.isGameOver = true;
            this.gameOverMsgs = ["YOU WIN!"];
        },

        gameOver: function (msg) {
            this.isGameOver = true;
            this.gameOverMsgs = ["GAME OVER", msg];
        }
    };

    var SurfaceSegment = function (x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    SurfaceSegment.prototype =
    {
        update: function () {
        },

        draw: function (screen) {
            screen.beginPath();
            screen.moveTo(this.x1, this.y1);
            screen.lineTo(this.x2, this.y2);
            screen.stroke();
        }
    }

    var LandingPad = function (x) {
        this.x = x;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    LandingPad.prototype =
    {
        update: function () {
        },

        draw: function (screen) {
            screen.beginPath();
            screen.moveTo(this.x, this.y);
            screen.lineTo(this.x, this.y - this.height);
            screen.lineTo(this.x + this.width, this.y - this.height);
            screen.lineTo(this.x + this.width, this.y);
            screen.closePath();
            screen.stroke();
        }
    }

    var Ship = function (game) {
        this.game = game;
        this.fuel = 100;
        do {
            this.position = { x: game.gameSize.x * 0.2 + Math.random() * game.gameSize.x * 0.6, y: 10 };
        } while ((Math.abs(this.position.x - this.game.landingPad.x - this.game.landingPad.width / 2)) < 50);

        this.size = { width: 10, height: 10 };
        this.angle = 0;
        this.thrust = 0;
        this.speed = { x: 0.0, y: 0.01 };
        this.Input = new Input();
    }



    Ship.prototype =
    {
        update: function () {
            if (this.fuel > 0) {
                if (this.Input.isDown(this.Input.KEYS.LEFT)) {
                    this.angle += Math.PI / 180 * 2;
                }
                if (this.Input.isDown(this.Input.KEYS.RIGHT)) {
                    this.angle -= Math.PI / 180 * 2;
                }

                this.angle = Math.max(-Math.PI * 3 / 4, Math.min(Math.PI * 3 / 4, this.angle));

                if (!this.Input.isDown(this.Input.KEYS.SPACE)) {
                    this.thrust = -0.0017;
                    this.thrust = Math.max(this.thrust, 0);
                }
                else {
                    this.thrust += 0.0021;
                    this.thrust = Math.min(this.thrust, 0.05);
                }
            }
            else {
                this.thrust = 0;
            }

            this.fuel = Math.max(0, this.fuel - this.thrust * 7);

            this.speed.x = this.speed.x - this.thrust * Math.sin(this.angle);
            this.speed.y = this.speed.y - this.thrust * Math.cos(this.angle);
            this.speed.y = this.speed.y + 0.005;

            this.position.x = this.position.x + this.speed.x;
            this.position.y = this.position.y + this.speed.y;

            if (this.game.touchingLandingPad(this.position.x, this.position.y, 10 * Math.sin(this.angle), 10 * Math.cos(this.angle))) {
                this.game.win();
            }
            if (this.game.outOfBounds(this.position.x, this.position.y, 10 * Math.sin(this.angle), 10 * Math.cos(this.angle))) {
                this.game.gameOver("You went off into space");
            }
            if (this.game.touchingSurface(this.position.x, this.position.y, 10 * Math.sin(this.angle), 10 * Math.cos(this.angle))) {
                if (this.fuel > 0) {
                    this.game.gameOver("You crashed, causing a crater " + Math.round(this.fuel / 1.7) + " km wide.");
                }
                else {
                    this.game.gameOver("You crashed.");
                }
            }
        },

        draw: function (screen) {
            var x1 = this.position.x;
            var y1 = this.position.y;
            var x2 = x1 + 10 * Math.sin(-this.angle);
            var y2 = y1 - 10 * Math.cos(-this.angle);
            var x3 = x2 + 10 * Math.sin(-this.angle + Math.PI / 8);
            var y3 = y2 - 10 * Math.cos(-this.angle + Math.PI / 8);
            var x4 = x3 + 10 * Math.sin(-this.angle + Math.PI * 7 / 8);
            var y4 = y3 - 10 * Math.cos(-this.angle + Math.PI * 7 / 8);
            var x5 = x4 + 10 * Math.sin(-this.angle + Math.PI);
            var y5 = y4 - 10 * Math.cos(-this.angle + Math.PI);
            screen.beginPath();
            screen.moveTo(x1, y1);
            screen.lineTo(x2, y2);
            screen.lineTo(x3, y3);
            screen.lineTo(x4, y4);
            screen.lineTo(x2, y2);
            screen.moveTo(x4, y4);
            screen.lineTo(x5, y5);
            screen.lineTo(x1, y1);
            screen.stroke();

            if (this.thrust > 0)
            {
                var fireSize = this.thrust * 100;
                
                var x1 = this.position.x + 1 * Math.sin(this.angle + Math.PI / 4);
                var y1 = this.position.y + 1 * Math.cos(this.angle + Math.PI / 4);
                var x2 = x1 + 6 * Math.sin(this.angle + Math.PI / 2);
                var y2 = y1 + 6 * Math.cos(this.angle + Math.PI / 2);
                var x3 = x1 + 3 * Math.sin(this.angle + Math.PI / 2) - fireSize * Math.sin(this.angle + Math.PI);
                var y3 = y1 + 3 * Math.cos(this.angle + Math.PI / 2) - fireSize * Math.cos(this.angle + Math.PI);
                screen.beginPath();
                screen.moveTo(x1, y1);
                screen.lineTo(x2, y2);
                screen.lineTo(x3, y3);
                screen.lineTo(x1, y1);
                screen.stroke();
            }
        }
    }

    var Input = function () {
        var keyState = {};

        window.onkeydown = function (e) {
            keyState[e.keyCode] = true;
        }
        window.onkeyup = function (e) {
            keyState[e.keyCode] = false;
        }

        this.isDown = function (keyCode) {
            return keyState[keyCode] === true;
        }

        this.KEYS = { LEFT: 37, RIGHT: 39, SPACE: 32 };
    };

    window.onload = function () {
        new Game("screen");
    }
})();
