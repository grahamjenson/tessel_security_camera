// Generated by CoffeeScript 1.9.1
(function() {
  var accel, ambient, camera, climate, get_light_and_sound, get_temp, get_xyz, is_burning, is_light_sound_changing, is_moving, promisify, q, take_a_picutre, tessel, turn_camera_on;

  tessel = require('tessel');

  q = require('q');

  promisify = function(fn, thisArg) {
    var callback, defer;
    if (thisArg == null) {
      thisArg = null;
    }
    defer = q.defer();
    callback = function(err, data) {
      if (err) {
        return defer.reject(err);
      }
      return defer.resolve(data);
    };
    fn.apply(thisArg, [callback]);
    return defer.promise;
  };

  accel = require('accel-mma84').use(tessel.port['C']);

  get_xyz = function() {
    return promisify(accel.getAcceleration, accel);
  };

  is_moving = function(sensitivity) {
    var xyz1, xyz2;
    if (sensitivity == null) {
      sensitivity = 0.005;
    }
    xyz1 = null;
    xyz2 = null;
    return get_xyz().then(function(xyz) {
      xyz1 = xyz;
      return q.delay(1000).then(function() {
        return get_xyz();
      });
    }).then(function(xyz) {
      var diffx, diffy, diffz;
      xyz2 = xyz;
      diffx = Math.abs(xyz2[0] - xyz1[0]);
      diffy = Math.abs(xyz2[1] - xyz1[1]);
      diffz = Math.abs(xyz2[2] - xyz1[2]);
      if ((diffx + diffy + diffz) > sensitivity) {
        return true;
      } else {
        return false;
      }
    });
  };

  climate = require('climate-si7020').use(tessel.port['D']);

  get_temp = function() {
    return promisify(climate.readTemperature, climate);
  };

  is_burning = function(max_temp) {
    if (max_temp == null) {
      max_temp = 30;
    }
    return get_temp().then(function(temp) {
      console.log(temp);
      if (temp > max_temp) {
        return true;
      } else {
        return false;
      }
    });
  };

  ambient = require('ambient-attx4').use(tessel.port['B']);

  get_light_and_sound = function() {
    return q.all([promisify(ambient.getLightLevel, ambient), promisify(ambient.getSoundLevel, ambient)]);
  };

  is_light_sound_changing = function(light_sensitivity, sound_sensitivity) {
    var l1, l2, s1, s2;
    if (light_sensitivity == null) {
      light_sensitivity = 0.001;
    }
    if (sound_sensitivity == null) {
      sound_sensitivity = 0.005;
    }
    l1 = null;
    l2 = null;
    s1 = null;
    s2 = null;
    return get_light_and_sound().then(function(light_and_sound) {
      l1 = light_and_sound[0];
      s1 = light_and_sound[1];
      return q.delay(1000).then(function() {
        return get_light_and_sound();
      });
    }).then(function(light_and_sound) {
      var diffl, diffs;
      l2 = light_and_sound[0];
      s2 = light_and_sound[1];
      diffl = Math.abs(l1 - l2);
      diffs = Math.abs(s1 - s2);
      console.log('diff', diffl, diffs);
      if (diffl > light_sensitivity || diffs > sound_sensitivity) {
        return true;
      } else {
        return false;
      }
    });
  };

  camera = require('camera-vc0706').use(tessel.port['A']);

  turn_camera_on = function() {
    var camera_ready_defer;
    console.log("Turn Camera On");
    camera_ready_defer = q.defer();
    camera.on('ready', function() {
      console.log("Camera On");
      return camera_ready_defer.resolve(true);
    });
    return camera_ready_defer.promise;
  };

  take_a_picutre = function() {
    return promisify(camera.takePicture, camera).then(function(image) {
      var name;
      console.log("Image Taken:", image);
      name = "picture-" + (Date.now()) + ".jpg";
      console.log('Picture saving as', name, '...');
      process.sendfile(name, image);
      return console.log('done.');
    });
  };

  turn_camera_on().then(function() {
    return setInterval(function() {
      return q.all([is_light_sound_changing(), is_burning(), is_moving()]).spread(function(lsc, burning, moving) {
        if (lsc || burning || moving) {
          if (lsc) {
            console.log("Light or Sound Changing");
          }
          if (burning) {
            console.log("Burning");
          }
          if (moving) {
            console.log("Moving");
          }
          return take_a_picutre();
        } else {
          return console.log("Nothing is happening");
        }
      });
    }, 10000);
  });

}).call(this);
