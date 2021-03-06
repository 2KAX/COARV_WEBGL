Weapons = function (Player) {
    // On permet d'acc?der ? Player n'importe o? dans Weapons
    this.Player = Player;

    // Positions selon l'arme non utilis?e
    this.bottomPosition = new BABYLON.Vector3(0.5, -2.5, 1);

    // Changement de Y quand l'arme est s?l?ctionn?e
    this.topPositionY = -0.5;

    // Cr?ons notre arme
    this.rocketLauncher = this.newWeapon(Player);

    // Temps minimum entre deux balles
    this.fireRate = 800;

    // Delta de calcul pour savoir quand le tir est a nouveau disponible
    this._deltaFireRate = this.fireRate;

    // Variable qui va changer selon le temps
    this.canFire = true;

    // Variable qui changera ? l'appel du tir depuis le Player
    this.launchBullets = false;

    // _this va nous permettre d'acceder ? l'objet depuis des fonctions que nous utiliserons plus tard
    var _this = this;

    // Engine va nous ?tre utile pour la cadence de tir
    var engine = Player.game.scene.getEngine();

    Player.game.scene.registerBeforeRender(function () {
        if (!_this.canFire) {
            _this._deltaFireRate -= engine.getDeltaTime();
            if (_this._deltaFireRate <= 0 && _this.Player.isAlive) {
                _this.canFire = true;
                _this._deltaFireRate = _this.fireRate;
            }
        }
    });
};

Weapons.prototype = {
    newWeapon: function (Player) {
        var newWeapon;

        newWeapon = BABYLON.Mesh.CreateBox('rocketLauncher', 0.5, Player.game.scene);

        // Nous faisons en sorte d'avoir une arme d'apparence plus longue que large
        newWeapon.scaling = new BABYLON.Vector3(1, 0.7, 2);

        // On l'associe ? la cam?ra pour qu'il bouge de la m?me facon
        newWeapon.parent = Player.camera;

        // On positionne le mesh APRES l'avoir attach? ? la cam?ra
        newWeapon.position = this.bottomPosition.clone();
        newWeapon.position.y = this.topPositionY;

        // Ajoutons un material Rouge pour le rendre plus visible
        var materialWeapon = new BABYLON.StandardMaterial('rocketLauncherMat', Player.game.scene);
        materialWeapon.diffuseColor = new BABYLON.Color3(1, 0, 0);

        newWeapon.material = materialWeapon;

        return newWeapon
    },

    fire: function (pickInfo) {
        this.launchBullets = true;
    },
    stopFire: function (pickInfo) {
        this.launchBullets = false;
    },
    launchFire: function () {
        if (this.canFire) {
            var renderWidth = this.Player.game.engine.getRenderWidth(true);
            var renderHeight = this.Player.game.engine.getRenderHeight(true);

            var direction = this.Player.game.scene.pick(renderWidth / 2, renderHeight / 2);
            direction = direction.pickedPoint.subtractInPlace(this.Player.camera.position);
            direction = direction.normalize();

            this.createRocket(this.Player.camera.playerBox, direction)
            this.canFire = false;
        } else {
            // Nothing to do : cannot fire
        }
    },
    createRocket: function (playerPosition, direction) {
        var positionValue = this.rocketLauncher.absolutePosition.clone();
        var rotationValue = playerPosition.rotation;
        var Player = this.Player;
        var newRocket = BABYLON.Mesh.CreateBox("rocket", 1, this.Player.game.scene);
        newRocket.direction = new BABYLON.Vector3(
            Math.sin(rotationValue.y) * Math.cos(rotationValue.x),
            Math.sin(-rotationValue.x),
            Math.cos(rotationValue.y) * Math.cos(rotationValue.x)
        )
        newRocket.position = new BABYLON.Vector3(
            positionValue.x + (newRocket.direction.x * 1),
            positionValue.y + (newRocket.direction.y * 1),
            positionValue.z + (newRocket.direction.z * 1));
        newRocket.rotation = new BABYLON.Vector3(rotationValue.x, rotationValue.y, rotationValue.z);
        newRocket.scaling = new BABYLON.Vector3(0.5, 0.5, 1);
        newRocket.isPickable = false;

        newRocket.material = new BABYLON.StandardMaterial("textureWeapon", this.Player.game.scene);
        newRocket.material.diffuseColor = new BABYLON.Color3(1, 0, 0);


        newRocket.registerAfterRender(function () {
            // On bouge la roquette vers l'avant
            newRocket.translate(new BABYLON.Vector3(0, 0, 1), 1, 0);

            // On cr?e un rayon qui part de la base de la roquette vers l'avant
            var rayRocket = new BABYLON.Ray(newRocket.position, newRocket.direction);

            // On regarde quel est le premier objet qu'on touche
            var meshFound = newRocket.getScene().pickWithRay(rayRocket);

            // Si la distance au premier objet touch? est inf?rieure a 10, on d?truit la roquette
            if (!meshFound || meshFound.distance < 10) {
                // On v?rifie qu'on a bien touch? quelque chose
                if (meshFound.pickedMesh) {
                    // On cr?e une sphere qui repr?sentera la zone d'impact
                    var explosionRadius = BABYLON.Mesh.CreateSphere("sphere", 5.0, 20, Player.game.scene);
                    // On positionne la sph?re l? o? il y a eu impact
                    explosionRadius.position = meshFound.pickedPoint;
                    // On fait en sorte que les explosions ne soient pas consid?r?es pour le Ray de la roquette
                    explosionRadius.isPickable = false;
                    // On cr?e un petit material orange
                    explosionRadius.material = new BABYLON.StandardMaterial("textureExplosion", Player.game.scene);
                    explosionRadius.material.diffuseColor = new BABYLON.Color3(1, 0.6, 0);
                    explosionRadius.material.specularColor = new BABYLON.Color3(0, 0, 0);
                    explosionRadius.material.alpha = 0.8;

                    // Chaque frame, on baisse l'opacit? et on efface l'objet quand l'alpha est arriv? ? 0
                    explosionRadius.registerAfterRender(function () {
                        explosionRadius.material.alpha -= 0.02;
                        if (explosionRadius.material.alpha <= 0) {
                            explosionRadius.dispose();
                        }
                    });
                }
                newRocket.dispose();
            }
        });
    },
};