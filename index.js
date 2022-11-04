const express = require("express");
const app = express();
const fs = require('fs');
//const { promises: Fs } = require('fs')
const mime = require('mime');

const bodyParser = require("body-parser");
//const Users = require("./db.js")
//const dbDevice = require("./dbDevice.js")

var jwt = require("jsonwebtoken");

app.use(bodyParser.json({ limit: "10mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));

//app.use(bodyParser.urlencoded({extended: false}))
//app.use(bodyParser.json())
app.get("/", (req, res) => res.send("Welcome to Express"));

const sequelize = require("sequelize");

const { QueryTypes, BOOLEAN } = require("sequelize");

const readXlsxFile = require("read-excel-file/node");

// Time milisecond of 1 day
const ONE_SECOND = 1000;
const ONE_MINUTE = 1 * 1000 * 60;
const TWO_MINUTES = 2 * 1000 * 60;
const ONE_HOUR = 1 * 1000 * 60 * 60;
const DAY_TIME = 1 * 1000 * 60 * 60 * 24;
const MONTH_TIME = 1 * 1000 * 60 * 60 * 24 * 30;

const expTimeUser = MONTH_TIME;

const IN_STOCK_STATE = 0;
const USING_STATE = 1;
const GUARANTEE_STATE = 2;
const BREAKDOWN_STATE = 3;

const DAY_VALUE = 0;
const MONTH_VALUE = 1;
const YEAR_VALUE = 2;

var usernames = [];
var userIdList = [];

var userCountList = [];

var addEmployee = 0;

const db = new sequelize({
  database: "DeviceManagementTest",
  username: "postgres",
  password: "123456",
  host: "localhost",
  port: 5432,
  dialect: "postgres" || "mysql",
  define: {
    freezeTableName: true,
  },
});

db.sync().then(() => console.log("Create database success"));

// Table Database =======================================================================================================================
const Device = db.define("Device", {
  serial: {
    type: sequelize.STRING,
    primaryKey: true,
  },
  code: sequelize.STRING,
  property_type: sequelize.STRING,
  device_type: sequelize.INTEGER,
  supplier: sequelize.STRING,
  brand: sequelize.STRING,
  model: sequelize.STRING,
  price: sequelize.BIGINT,
  purchase_day: sequelize.BIGINT,
  warranty_time: sequelize.INTEGER,
  warranty_time_unit: sequelize.INTEGER,
  state: sequelize.INTEGER,
  begin_using_day: sequelize.BIGINT,
  note: sequelize.STRING,
  last_updated: sequelize.BIGINT,
});
const AssignHistory = db.define("AssignHistory", {
  serial: {
    type: sequelize.STRING,
  },
  code: {
    type: sequelize.STRING,
  },
  content: sequelize.STRING,
  assign_day: {
    type: sequelize.BIGINT,
    primaryKey: true,
  },
  active: sequelize.BOOLEAN,
});
const Employee = db.define("Employee", {
  code: {
    type: sequelize.STRING,
    primaryKey: true,
  },
  name: sequelize.STRING,
  position: sequelize.STRING,
  email: sequelize.STRING,
  password: sequelize.STRING,
  role: sequelize.STRING,
  phone: sequelize.STRING,
  birthday: sequelize.BIGINT,
  total_device: sequelize.INTEGER,
  note: sequelize.STRING,
  office: sequelize.STRING,
  avatar_url: sequelize.STRING,
  last_updated: sequelize.BIGINT,
});
const UserToken = db.define("UserToken", {
  token: {
    type: sequelize.STRING,
    primaryKey: true,
  },
  code: sequelize.STRING,
  expires: sequelize.BIGINT,
});

function isEmpty(obj) {
  return !Object.keys(obj).length > 0;
}

function convertNum(input) {
  var number = input.trim();
  if (isNaN(number) || isEmpty(number) || number == null) {
    return 0;
  } else {
    return number;
  }
}

function toTimestamp(input) {
  var strDate = input.trim();
  if (isEmpty(strDate)) {
    return 0;
  } else {
    var datum = Date.parse(strDate);
    if (isNaN(datum)) {
      return 0;
    }
    return datum;
  }
}

function toWarrantyTime(input) {
  var strNumber = input.trim();
  //console.log("TEST8888_strNumber: " + strNumber)
  var num = strNumber.substring(0, 2).trim();
  //console.log("TEST8888_num: " + num)
  // console.log("TEST8888_num: " + num)
  if (isNaN(num) || isEmpty(num) || num == null) {
    //   console.log("TEST8888_num: " + num)
    return 0;
  } else {
    return Number(num);
  }
}

function toWarrantyTimUnit(input) {
  var strNumber = input.trim();
  if (isNaN(strNumber) || isEmpty(strNumber) || strNumber == null) {
    return 0;
  } else {
    var unit = strNumber.substring(2).toLowerCase();
    var result = 0;
    switch (unit) {
      case "years":
        result = 2;
        break;
      case "months":
        result = 1;
        break;
      default:
        result = 0;
    }
    return result;
  }
}

function convertState(state) {
  //console.log("TEST8888_state: " + state)

  var result = 0;

  switch (state) {
    case "In stock":
      result = 0;
      break;
    case "Using":
      result = 1;
      break;
    case "Guarantee":
      result = 2;
      break;
    case "Break Down":
      result = 3;
      break;
    default:
      result = 0;
  }

  return result;
}

function getCodeFromName(name) {
  //  console.log("TEST8888_name: " + name)

  var size = name.split(" ").length;
  if (size > 1) {
    var nameArray = name.split(" ");
    var code = "";
    for (var i = 0; i < size; i++) {
      code = code + nameArray[i].substring(0, 2);
    }
    return code;
  } else {
    return name;
  }
}

// Get Data from excel file =======================================================================================================================
//Get Device Data

// readXlsxFile('./files/ITSJ_ASSETS.xlsx', { sheet: 2 }).then((rowDatas) => {
//     // console.log("TEST8888_rows 0 : "+ rows[6])

//     console.log("TEST8888_rows lenght : " + rowDatas.length)

//     const rows = rowDatas[6].toString().split(',');

//     console.log("TEST888_rows: " + JSON.stringify(rows))

//     var deviceList = []
//     for (var i = 6; i < 156; i++) {
//         const rows = rowDatas[i].toString().split(',');

//         var serial = rows[5]
//         var code = getCodeFromName(rows[12])
//         var property_type = rows[1]
//        // var device_type = rows[2]

//        var device_type = 9
//        switch(rows[2]) {
//           case "Laptop":
//             device_type = 1
//             break;
//           case "Loa Di Dong":
//             device_type = 8
//             break;
//           case "Projector":
//             device_type = 2
//               break;
//          case "Monitor":
//           device_type = 7
//               break;
//         case "Mobile Phone":
//           device_type = 6
//               break;
//        case "Webcam":
//         device_type = 4
//               break;
//       case "Webcam":
//         device_type = 5
//               break;
//           default:
//             break;
//         }


//         var supplier = rows[6]
//         var brand = rows[3]
//         var model = rows[4].split("''").join(" inch")
//         var price = convertNum(rows[7])
//         var purchaseDay = rows[15].split("_").join("")
//         var purchase_day = toTimestamp(purchaseDay)
//         var warranty_time = toWarrantyTime(rows[9])
//         var warranty_time_unit = toWarrantyTimUnit(rows[9])
//         var state = convertState(rows[10])
//         var beginUsingDay = rows[16].split("_").join("")
//         var begin_using_day = toTimestamp(beginUsingDay)
//         var note = rows[13] + rows[14]
//         var last_updated = Date.now()

//         var device = {
//             serial: serial, code: code, property_type: property_type, device_type: device_type, supplier: supplier,
//             brand: brand, model: model, price: price, purchase_day: purchase_day, warranty_time: warranty_time,
//             warranty_time_unit: warranty_time_unit, state: state, begin_using_day: begin_using_day, note: note, last_updated: last_updated
//         }
//         deviceList.push(device)
//     }

//     console.log("TEST888_deviceList: " + JSON.stringify(deviceList))

//     Device.bulkCreate(deviceList).then(() => console.log("Add data success"))
//         .catch((err) => console.log("Error: ", err))

// })

// Get Emplooye Data
// readXlsxFile('./files/ITSJ_EMPLOYEE CONTACT.xlsx', { sheet: 2 }).then((rowDatas) => {
//     // console.log("TEST8888_rows 0 : "+ rows[6])

//     console.log("TEST8888_rows lenght : " + rowDatas.length)

//     const rows = rowDatas[66].toString().split(',');

//     console.log("TEST888_rows: " + JSON.stringify(rows))

//     var employeeList = []
//     for (var i = 3; i < 72; i++) {
//         const rows = rowDatas[i].toString().split(',');

//         var code = getCodeFromName(rows[1])
//         var name = rows[1]
//         var position = rows[2]
//         var email = rows[3]
//         var phone = rows[4]
//         var password = "123456"
//         var role = "employee"
//         if(email == "hatm@itsj-group.com" || email == "sanghv@itsj-group.com") role = "admin"
//         var birthday = toTimestamp(rows[5])
//         var total_device = 0
//         var note = rows[7]
//         var office = rows[8]
//         var avatar_url = "https://photographer.com.vn/wp-content/uploads/2020/08/1596889696_Anh-avatar-dep-va-doc-dao-lam-hinh-dai-dien.jpg"
//         var last_updated = Date.now()

//         var employee = {
//             code: code, name: name, position: position, email: email, password: password,
//             role: role, phone: phone, birthday: birthday, total_device: total_device, note: note, office: office,
//             avatar_url: avatar_url, last_updated: last_updated
//         }
//         employeeList.push(employee)
//     }

//     console.log("TEST888_employeeList: " + JSON.stringify(employeeList))

//     Employee.bulkCreate(employeeList).then(() => console.log("Add data success"))
//         .catch((err) => console.log("Error: ", err))

// })

// Get The Assign History Data
// readXlsxFile('./files/ITSJ_ASSETS.xlsx', { sheet: 2 }).then((rowDatas) => {

//     console.log("TEST8888_rows lenght : " + rowDatas.length)

//     var assignHistorys = []
//     var assign_day = Date.now() - DAY_TIME
//     for (var i = 6; i < 156; i++) {
//         const rows = rowDatas[i].toString().split(',');

//         var serial = rows[5]
//         var name = rows[12]
//         if(!isEmpty(name)){
//             var code = getCodeFromName(rows[12])
//             var content = ""
//             assign_day = assign_day + ONE_MINUTE

//             var assignHistory = { serial: serial, code: code, content: content, assign_day: assign_day, active: true }
//             assignHistorys.push(assignHistory)
//         }
//     }

//     console.log("TEST888_assignHistorys: " + JSON.stringify(assignHistorys))
//     AssignHistory.bulkCreate(assignHistorys).then(() => console.log("Add data success"))
//         .catch((err) => console.log("Error: ", err))

// })

// readXlsxFile('./files/ITSJ_ASSETS.xlsx', { sheet: 2 }).then((rowAssigns) => {

//     var _assignHistories = []

//     var assign_day = Date.now()
//     for (var i = 6; i < 156; i++) {
//         const rows = rowAssigns[i].toString().split(',');

//         var serial = rows[5]
//         var name = rows[12]
//         if (!isEmpty(name)) {
//             var code = getCodeFromName(rows[12])
//             var content = ""
//             assign_day = assign_day + ONE_HOUR

//             var assignHistory = { serial: serial, code: code, content: content, assign_day: assign_day, active: true }
//             _assignHistories.push(assignHistory)
//         }
//     }

//     readXlsxFile('./files/ITSJ_EMPLOYEE CONTACT.xlsx', { sheet: 2 }).then((rowDatas) => {

//         console.log("TEST9999_assignHistories lenght : " + _assignHistories.length)

//         const rows = rowDatas[66].toString().split(',');

//         console.log("TEST888_rows: " + JSON.stringify(rows))

//         var employeeList = []
//         for (var i = 3; i < 72; i++) {
//             const rows = rowDatas[i].toString().split(',');

//             var code = getCodeFromName(rows[1])
//             var name = rows[1]
//             var position = rows[2]
//             var email = rows[3]
//             var phone = rows[4]
//             var password = "123456"
//             var role = "employee"
//             if (email == "hatm@itsj-group.com" || email == "sanghv@itsj-group.com") role = "admin"
//             var birthday = toTimestamp(rows[5])
//             var total_device = 0
//             var note = rows[7]
//             var office = rows[8]
//             var avatar_url = "https://photographer.com.vn/wp-content/uploads/2020/08/1596889696_Anh-avatar-dep-va-doc-dao-lam-hinh-dai-dien.jpg"
//             var last_updated = Date.now()

//             var employee = {
//                 code: code, name: name, position: position, email: email, password: password,
//                 role: role, phone: phone, birthday: birthday, total_device: total_device, note: note, office: office,
//                 avatar_url: avatar_url, last_updated: last_updated
//             }
//             employeeList.push(employee)
//         }

//         for (var i = 0; i < employeeList.length; i++) {
//             var totalDevice = 0
//             for (var j = 0; j < _assignHistories.length; j++) {
//                 if (employeeList[i].code.trim() == _assignHistories[j].code.trim()) {
//                     totalDevice = totalDevice + 1
//                 }
//             }
//             Employee.update({
//                 total_device: totalDevice
//             }, {
//                 where: { code: employeeList[i].code }
//             })
//                 .then(row => {
//                     console.log("TEST9999_ Update totalDevice Success")
//                 })
//                 .catch(err => {
//                     console.log("TEST9999_ Update totalDevice error: " + err)
//                 })
//         }

//     })
// })

// // API proccess ============================================================================================================================
app.post("/login", (req, res) => {
  console.log("/login");
  const body = req.body;

  var obj = JSON.parse(JSON.stringify(body));

  console.log("obj.username: " + obj.username);
  console.log("obj.password: " + obj.password);

  Employee.findAll({
    raw: true,
  }).then((users) => {
    console.log("users length: " + users.length);
    var result = false;
    var code = "";
    var role = "employee";
    for (var i = 0; i < users.length; i++) {
      var username = users[i].email;
      var password = users[i].password;

      console.log("username: " + username);
      console.log("password: " + password);

      if (obj.username == username && obj.password == password) {
        result = true;
        code = users[i].code;
        role = users[i].role;
        break;
      }
    }

    console.log("result: " + result);
    console.log("code: " + code);

    if (result) {
      //res.json({ "result": true, "token": "token", "role": users[i].role, "user_code": users[i].code })
      UserToken.destroy({
        where: {
          code: code,
        },
      })
        .then((row) => {
          const token = jwt.sign({ code: code }, "RANDOM_TOKEN_SECRET");

          console.log("token: " + token);

          var now = Date.now();

          console.log("TEST1111_NOW: " + now);

          var expTime = now + expTimeUser;

          console.log("expTime: " + expTime);
          console.log("role:  " + role);
          console.log("code: " + code);

          UserToken.create({
            token: token,
            code: code,
            expires: expTime,
          })
            .then((row) => {
              res.json({
                result: true,
                data: { token: token, role: role, user_code: code },
              });
              console.log("UserToken.create success");
            })
            .catch((err) => {
              console.log("Login failed!" + err);
              res.json({ result: false, error: "SV002" });
            });
        })
        .catch((err) => {
          console.log("Login Error: " + err);
          res.json({ result: false, error: "SV003" });
        });
    } else {
      console.log("Username or password is incorect! ");
      res.json({ result: false, error: "SV001" });
    }
  });

  // User.create({
  //     username: obj.username,
  //     password: obj.password,
  //     role: "admin"
  // })
  //     .then(row => {
  //         User.max('id')
  //             .then(userId => {
  //                 console.log("TEST_maxId: " + userId)
  //                 console.log("login success username " + obj.username)
  //                 // var token = jwt.sign({ id: userId},{
  //                 //     expiresIn: 86400 // expires in 24 hours
  //                 // });

  //                 const token = jwt.sign(
  //                     { userId: userId },
  //                     'RANDOM_TOKEN_SECRET');

  //                 console.log("token " + token)

  //                 var expTime = Date.now() + DayTime

  //                 console.log("expTime " + expTime)

  //                 UserToken.create({
  //                     userId: userId,
  //                     token: token,
  //                     expiresIn: expTime
  //                 }).then(row => {
  //                     res.json({ "result": true, "token": token })
  //                 }).catch(err => {
  //                     console.log("Login fail " + err.messages)
  //                     res.json({ "result": false, error: err.messages })
  //                 })
  //             })
  //     })
  //     .catch(err => {
  //         console.log("Login fail username " + obj.username)
  //         res.json({ "result": false, error: err.messages })
  //     })

  // for (var i = 1; i < userIdList.length; i++) {

  //     const token = jwt.sign(
  //         { userId: userIdList[i] },
  //         'RANDOM_TOKEN_SECRET');

  //     console.log("token " + token)

  //     var expTime = Date.now() + DayTime

  //     console.log("expTime " + expTime)

  //     UserToken.create({
  //         userId: userIdList[i],
  //         token: token,
  //         expiresIn: expTime
  //     }).then(row => {
  //         // res.json({ "result": true, "token": token })
  //     }).catch(err => {
  //         console.log("Login fail " + err.messages)
  //         //res.json({ "result": false, error: err.messages })
  //     })
  // }
});

app.post("/logout", (req, res) => {
  console.log("/logout");

  const headers = req.headers;

  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_token: " + token);

  UserToken.destroy({
    where: {
      token: token,
    },
  })
    .then((row) => {
      console.log("Logout SUCESSSSSSSSSSSS");
      res.json({ result: true });
    })
    .catch((err) => {
      console.log("Logout Error");
      res.json({ result: false, error: "SV100" });
    });
});

app.post("/changePassword", (req, res) => {
  console.log("/changePassword");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        const body = req.body;

        var obj = JSON.parse(JSON.stringify(body));

        console.log("body: " + JSON.stringify(body));
        console.log("obj.password: " + obj.password);
        console.log("obj.user_code: " + obj.user_code);

        Employee.update(
          {
            password: obj.password,
          },
          {
            where: { code: obj.user_code },
          }
        )
          .then((row) => {
            console.log("Change password success user id " + obj.user_code);
            res.json({ result: true });
          })
          .catch((err) => {
            console.log("Change password failed  user id " + obj.user_code);
            res.json({
              result: false,
              error: "SV200",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.get("/getDevices", (req, res) => {
  console.log("/getDevices");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        console.log("AUTHEN TOKEN SUCCESS:  ");

        //AUTHEN TOKEN SUCCESS
        Device.findAll({
          raw: true,
        })
          .then((devices) => {
            console.log("devices.length:  " + devices.length);
            if (devices.length == 0) {
              res.json({ result: true, data: [] });
            }

            var deviceList = [];
            var i = 0;
            devices.forEach((element) => {
              var device = {
                serial: element.serial,
                code: element.code,
                property_type: element.property_type,
                device_type: element.device_type,
                supplier: element.supplier,
                brand: element.brand,
                model: element.model,
                price: element.price,
                purchase_day: element.purchase_day,
                warranty_time: element.warranty_time,
                warranty_time_unit: element.warranty_time_unit,
                state: element.state,
                begin_using_day: element.begin_using_day,
                note: element.note,
                last_updated: element.last_updated,
              };
              deviceList.push(device);

              if (i == devices.length - 1) {
                res.json({ result: true, data: deviceList });
                console.log("deviceList length:  " + deviceList.length);
                return;
              }
              i = i + 1;
            });
          })
          .catch((err) => {
            console.log("Get Device failed ");
            res.json({
              result: false,
              error: "SV3000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.get("/getDevicesNew", (req, res) => {
  console.log("/getDevices");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        console.log("AUTHEN TOKEN SUCCESS:  ");

        //AUTHEN TOKEN SUCCESS
        Device.findAll({
          raw: true,
        })
          .then((devices) => {
            console.log("devices.length:  " + devices.length);
            if (devices.length == 0) {
              res.json({ result: true, data: [] });
            }

            var deviceList = [];
            var i = 0;
            devices.forEach((element) => {
              var device = {
                serial: element.serial,
                name: element.brand + element.model,
                device_type: element.device_type,
                state: element.state,
                last_updated: element.last_updated,
                picture_url:
                  "https://bizweb.dktcdn.net/100/116/615/products/12pro.png?v=1602752545000",
              };
              deviceList.push(device);

              if (i == devices.length - 1) {
                res.json({ result: true, data: deviceList });
                console.log("deviceList length:  " + deviceList.length);
                return;
              }
              i = i + 1;
            });
          })
          .catch((err) => {
            console.log("Get Device failed ");
            res.json({
              result: false,
              error: "SV3000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/addDevice", (req, res) => {
  console.log("/addDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS
        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("serial: " + obj.serial);

        console.log("code: " + obj.code);

        Device.create({
          serial: obj.serial,
          code: obj.code,
          property_type: obj.property_type,
          device_type: obj.device_type,
          supplier: obj.supplier,
          brand: obj.brand,
          model: obj.model,
          price: obj.price,
          purchase_day: obj.purchase_day,
          warranty_time: obj.warranty_time,
          warranty_time_unit: obj.warranty_time_unit,
          state: obj.state,
          begin_using_day: obj.begin_using_day,
          note: obj.note,
          last_updated: obj.last_updated,
        })
          .then((row) => {
            console.log("Add success device " + obj.brand);
            res.json({ result: true });
          })
          .catch((err) => {
            console.log("Add fail device ");
            res.json({
              result: false,
              error: "SV300",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/editDevice", (req, res) => {
  console.log("/editDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS
        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("obj" + JSON.stringify(result));
        console.log("obj.brand" + obj.brand);
        console.log("obj.serial" + obj.serial);

        Device.update(
          {
            serial: obj.serial,
            code: obj.code,
            property_type: obj.property_type,
            device_type: obj.device_type,
            supplier: obj.supplier,
            brand: obj.brand,
            model: obj.model,
            price: obj.price,
            purchase_day: obj.purchase_day,
            warranty_time: obj.warranty_time,
            warranty_time_unit: obj.warranty_time_unit,
            state: obj.state,
            begin_using_day: obj.begin_using_day,
            note: obj.note,
            last_updated: obj.last_updated,
          },
          {
            where: { serial: obj.serial },
          }
        )
          .then((row) => {
            console.log("SUCESSSSSSSSSSSS row: " + row);
            res.json({ result: true });
          })
          .catch((err) => {
            console.log("Edit Device failed ! ");
            res.json({
              result: false,
              error: "SV400",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});
app.post("/editDevice1", (req, res) => {
  console.log("/editDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS
        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.device.code;

        console.log("obj" + JSON.stringify(result));

        console.log("obj.device.serial: " + obj.device.serial);
        console.log("obj.is_delete_assign: " + obj.is_delete_assign);

        if (obj.is_delete_assign) {
          code = null;
        }

        Device.update(
          {
            serial: obj.device.serial,
            code: code,
            property_type: obj.device.property_type,
            device_type: obj.device.device_type,
            supplier: obj.device.supplier,
            brand: obj.device.brand,
            model: obj.device.model,
            price: obj.device.price,
            purchase_day: obj.device.purchase_day,
            warranty_time: obj.device.warranty_time,
            warranty_time_unit: obj.device.warranty_time_unit,
            state: obj.device.state,
            begin_using_day: obj.device.begin_using_day,
            note: obj.device.note,
            last_updated: obj.device.last_updated,
          },
          {
            where: { serial: obj.device.serial },
          }
        )
          .then((row) => {
            // console.log("Edit success serial " + obj.serial)
            //res.json({ "result": true })

            AssignHistory.destroy({
              where: { serial: obj.device.serial },
            })
              .then((row) => {
                console.log("Edit success serial " + obj.device.serial);

                AssignHistory.count({
                  distinct: "code",
                  where: { code: obj.device.code, active: true },
                })
                  .then((count) => {
                    console.log("TEST66666_AssignHistory_Count_code: " + count);

                    console.log(
                      "TEST66666_AssignHistory_code: " + obj.device.code
                    );

                    Employee.update(
                      {
                        total_device: count,
                      },
                      {
                        where: { code: obj.device.code },
                      }
                    )
                      .then((row) => {
                        console.log("SUCESSSSSSSSSSSS ");
                        res.json({ result: true });
                      })
                      .catch((err) => {
                        console.log(
                          "Error Update Employe when add AssignHistory " +
                            err.messages
                        );
                        res.json({
                          result: false,
                          error: "SV403",
                        });
                      });
                  })
                  .catch((err) => {
                    console.log(
                      "TEST66666_AssignHistory_Count_code Error" + err
                    );
                    res.json({
                      result: false,
                      error: "SV402",
                    });
                  });
              })
              .catch((err) => {
                console.log("Edit Delete Device failed  ");
                res.json({
                  result: false,
                  error: "SV401",
                });
              });
          })
          .catch((err) => {
            console.log("Edit Device failed ! ");
            res.json({
              result: false,
              error: "SV400",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/deleteDevice", (req, res) => {
  console.log("/deleteDevice");

  console.log("/editDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("serial: " + obj.serial);
        Device.destroy({
          where: { serial: obj.serial },
        })
          .then((row) => {
            console.log("Delete success serial " + obj.serial);
            AssignHistory.destroy({
              where: { serial: obj.serial },
            })
              .then((row) => {
                console.log("Edit success serial " + obj.serial);
                console.log("obj.code " + obj.code);

                if (obj.code != null) {
                  AssignHistory.count({
                    distinct: "code",
                    where: { code: obj.code, active: true },
                  })
                    .then((count) => {
                      console.log(
                        "TEST66666_AssignHistory_Count_code: " + count
                      );

                      console.log("TEST66666_AssignHistory_code: " + obj.code);

                      Employee.update(
                        {
                          total_device: count,
                        },
                        {
                          where: { code: obj.code },
                        }
                      )
                        .then((row) => {
                          console.log("SUCESSSSSSSSSSSS ");
                          res.json({
                            result: true,
                          });
                        })
                        .catch((err) => {
                          console.log(
                            "Error Update Employe when add AssignHistory " +
                              err.messages
                          );
                          res.json({
                            result: false,
                            error: "SV503",
                          });
                        });
                    })
                    .catch((err) => {
                      console.log(
                        "TEST66666_AssignHistory_Count_code Error" + err
                      );
                      res.json({
                        result: false,
                        error: "SV502",
                      });
                    });
                } else {
                  console.log("SUCESSSSSSSSSSSS ");
                  res.json({
                    result: true,
                  });
                }
              })
              .catch((err) => {
                console.log("Delete fail serial " + obj.device.serial);
                res.json({
                  result: false,
                  error: "SV501",
                });
              });
          })
          .catch((err) => {
            console.log("Delete fail serial " + obj.serial);
            res.json({
              result: false,
              error: "SV500",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getDevicesOfEmployee", (req, res) => {
  console.log("/getDevicesOfEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.code;

        console.log("code: " + code);

        if (typeof code === "undefined" || code == null) {
          res.json({
            result: false,
            error: "SV4001",
          });
        } else {
          Device.findAll({
            raw: true,
          })
            .then((devices) => {
              console.log("TEST8888:devices.length: " + devices.length);

              var deviceList = [];
              if (devices.length == 0) {
                res.json({ result: true, data: [] });
              }

              var i = 0;
              devices.forEach((element) => {
                if (element.code == code) {
                  var device = {
                    serial: element.serial,
                    code: element.code,
                    property_type: element.property_type,
                    device_type: element.device_type,
                    supplier: element.supplier,
                    brand: element.brand,
                    model: element.model,
                    price: element.price,
                    purchase_day: element.purchase_day,
                    warranty_time: element.warranty_time,
                    warranty_time_unit: element.warranty_time_unit,
                    state: element.state,
                    begin_using_day: element.begin_using_day,
                    note: element.note,
                    last_updated: element.last_updated,
                  };
                  deviceList.push(device);
                }

                if (i == devices.length - 1) {
                  console.log(
                    "TEST8888:deviceList.length: " + deviceList.length
                  );
                  res.json({ result: true, data: deviceList });
                  return;
                }
                i = i + 1;
              });
            })
            .catch((err) => {
              console.log(err);
              res.json({
                result: false,
                error: "SV4000",
              });
            });
        }
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/addEmployee", (req, res) => {
  console.log("/addEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const body = req.body;

        console.log("body: " + JSON.stringify(body));

        var obj = JSON.parse(JSON.stringify(body));

        console.log("TEST999_name: " + obj.name);

        var employeeList = [];
        var employee = {
          code: obj.code,
          name: obj.name,
          position: obj.position,
          email: obj.email,
          password: obj.password,
          role: obj.role,
          phone: obj.phone,
          birthday: obj.birthday,
          total_device: obj.total_device,
          note: obj.note,
          office: obj.office,
          avatar_url: obj.avatar_url,
          last_updated: obj.last_updated,
        };
        employeeList.push(employee);

        Employee.bulkCreate(employeeList)
          .then(() => {
            console.log("Add Employee success");
            res.json({ result: true });
          })
          .catch((err) => {
            console.log("Add Employee Error: ", err.messages);
            res.json({
              result: false,
              error: "SV600",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/editEmployee", (req, res) => {
  console.log("/editEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const body = req.body;

        console.log("body: " + JSON.stringify(body));

        var obj = JSON.parse(JSON.stringify(body));

        console.log("TEST999_name: " + obj.name);

        Employee.update(
          {
            name: obj.name,
            position: obj.position,
            email: obj.email,
            role: obj.role,
            phone: obj.phone,
            birthday: obj.birthday,
            total_device: obj.total_device,
            note: obj.note,
            office: obj.office,
            avatar_url: obj.avatar_url,
            last_updated: obj.last_updated,
          },
          {
            where: {
              code: obj.code,
            },
          }
        )
          .then((row) => {
            console.log("Edit Employee SUCCESSS");
            res.json({ result: true });
          })
          .catch((err) => {
            console.log("Edit Employee ERROR");
            res.json({
              result: false,
              error: "SV700",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/deleteEmployee", (req, res) => {
  console.log("/deleteEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const body = req.body;

        console.log("body: " + JSON.stringify(body));

        var obj = JSON.parse(JSON.stringify(body));

        var code = obj.code;
        console.log("TEST999_name: " + code);

        Device.update(
          {
            code: null,
            state: IN_STOCK_STATE,
            last_updated: Date.now(),
          },
          {
            where: {
              code: code,
            },
          }
        )
          .then((row) => {
            console.log("SUCCESS edit Device");

            AssignHistory.destroy({
              where: {
                code: obj.code,
              },
            })
              .then((row) => {
                console.log("Delete AssignHistory SUCESSSSSSSSSSSS");

                Employee.destroy({
                  where: {
                    code: obj.code,
                  },
                })
                  .then((row) => {
                    console.log("Delete Employee SUCESSSSSSSSSSSS");
                    res.json({ result: true });
                  })
                  .catch((err) => {
                    console.log("ERROR Delete Employee");
                    res.json({
                      result: false,
                      error: "SV802",
                    });
                  });
              })
              .catch((err) => {
                console.log("ERROR Delete AssignHistory ");
                res.json({
                  result: false,
                  error: "SV801",
                });
              });
          })
          .catch((err) => {
            console.log("Error edit Device");
            res.json({
              result: false,
              error: "SV800",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/addTheAssignHistories", (req, res) => {
  console.log("/addTheAssignHistories");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const body = req.body;

        console.log("body: " + JSON.stringify(body));

        var obj = JSON.parse(JSON.stringify(body));

        console.log("assignHistorys size:" + obj.length);

        var assignHistorys = [];
        var i = 0;
        obj.forEach((element) => {
          i = i + ONE_SECOND;
          assign_day = Number(element.assign_day) + Number(i);
          var assignHistory = {
            serial: element.serial,
            code: element.code,
            content: element.content,
            assign_day: assign_day,
            active: true,
          };
          assignHistorys.push(assignHistory);
        });

        AssignHistory.bulkCreate(assignHistorys)
          .then(() => {
            console.log("Add Assign Histories success");

            console.log("assignHistorys.length: " + assignHistorys.length);

            var rowUpdate = 0;

            for (var i = 0; i < assignHistorys.length; i++) {
              var lastUpdated = Date.now();
              var code = assignHistorys[i].code;
              var serial = assignHistorys[i].serial;
              var sate = USING_STATE;

              console.log("serial: " + serial);
              console.log("code: " + code);

              Device.update(
                {
                  code: code,
                  state: sate,
                  last_updated: Date.now(),
                },
                {
                  where: {
                    serial: serial,
                  },
                }
              )
                .then((row) => {
                  rowUpdate = rowUpdate + 1;
                  console.log("SUCESSSSSSSSSSSS");
                  console.log("row: " + rowUpdate);
                  console.log(
                    "assignHistorys.length: " + assignHistorys.length
                  );
                  if (rowUpdate == assignHistorys.length) {
                    AssignHistory.count({
                      distinct: "code",
                      where: { code: code, active: true },
                    })
                      .then((count) => {
                        console.log(
                          "TEST66666_AssignHistory_Count_code: " + count
                        );

                        Employee.update(
                          {
                            total_device: count,
                          },
                          {
                            where: { code: code },
                          }
                        )
                          .then((row) => {
                            console.log("SUCESSSSSSSSSSSS ");
                            res.json({ result: true });
                          })
                          .catch((err) => {
                            console.log(
                              "Error Update Employe when add AssignHistory " +
                                err
                            );
                            res.json({
                              result: false,
                              error: "SV903",
                            });
                          });
                      })
                      .catch((err) => {
                        console.log(
                          "TEST66666_AssignHistory_Count_code Error" + err
                        );
                        res.json({
                          result: false,
                          error: "SV902",
                        });
                      });
                  }
                })
                .catch((err) => {
                  console.log("ERRORRRRRRRRRRR");
                  res.json({
                    result: false,
                    error: "SV901",
                  });
                });
            }
          })
          .catch((err) => {
            console.log("Error: ", err);
            res.json({
              result: false,
              error: "SV900",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/addTheAssignHistories1", (req, res) => {
  console.log("/addAssignHistories");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const body = req.body;

        console.log("body: " + JSON.stringify(body));

        var obj = JSON.parse(JSON.stringify(body));

        console.log("assignHistorys size:" + obj.length);

        var assignHistorys = [];
        obj.forEach((element) => {
          var assignHistory = {
            serial: element.serial,
            code: element.code,
            content: element.content,
            assign_day: element.assign_day,
          };
          assignHistorys.push(assignHistory);
        });

        AssignHistory.bulkCreate(assignHistorys)
          .then(() => {
            console.log("Add Assign Histories success");

            console.log("assignHistorys.length: " + assignHistorys.length);

            var rowUpdate = 0;

            for (var i = 0; i < assignHistorys.length; i++) {
              var lastUpdated = Date.now();
              var code = assignHistorys[i].code;
              var serial = assignHistorys[i].serial;
              var sate = USING_STATE;

              console.log("serial: " + serial);
              console.log("code: " + code);

              Device.update(
                {
                  code: code,
                  state: 1,
                  last_updated: Date.now(),
                },
                {
                  where: {
                    serial: serial,
                  },
                }
              )
                .then((row) => {
                  rowUpdate = rowUpdate + 1;
                  console.log("SUCESSSSSSSSSSSS");
                  console.log("row: " + rowUpdate);
                  console.log(
                    "assignHistorys.length: " + assignHistorys.length
                  );
                  if (rowUpdate == assignHistorys.length) {
                    AssignHistory.count({
                      distinct: "code",
                      where: { code: code, active: true },
                    })
                      .then((count) => {
                        console.log(
                          "TEST66666_AssignHistory_Count_code: " + count
                        );

                        Employee.update(
                          {
                            total_device: count,
                          },
                          {
                            where: { code: code },
                          }
                        )
                          .then((row) => {
                            console.log("SUCESSSSSSSSSSSS ");
                            res.json({ result: true });
                          })
                          .catch((err) => {
                            console.log(
                              "Error Update Employe when add AssignHistory " +
                                err
                            );
                            res.json({
                              result: false,
                              error: "SV903",
                            });
                          });
                      })
                      .catch((err) => {
                        console.log(
                          "TEST66666_AssignHistory_Count_code Error" + err
                        );
                        res.json({
                          result: false,
                          error: "SV902",
                        });
                      });
                  }
                })
                .catch((err) => {
                  console.log("ERRORRRRRRRRRRR");
                  res.json({
                    result: false,
                    error: "SV901",
                  });
                });
            }

            assignHistorys.forEach((element) => {
              var assignHistory = {
                serial: element.serial,
                code: element.code,
                content: element.content,
                assign_day: element.assign_day,
              };
            });
          })
          .catch((err) => {
            console.log("Error: ", err);
            res.json({
              result: false,
              error: "SV900",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/editTheAssignHistory", (req, res) => {
  console.log("/editTheAssignHistory");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.code;
        var old_serial = obj.old_serial;
        var old_assign_day = obj.old_assign_day;

        var new_serial = obj.new_serial;
        var content = obj.content;
        var assign_day = obj.new_assign_day;

        console.log("code: " + code);
        console.log("old_serial: " + old_serial);
        console.log("new_serial: " + new_serial);
        console.log("content: " + content);
        console.log("assign_day: " + assign_day);
        console.log("old_assign_day: " + old_assign_day);

        AssignHistory.update(
          {
            active: false,
          },
          {
            where: {
              serial: old_serial,
              code: code,
              assign_day: old_assign_day,
            },
          }
        )
          .then((row) => {
            Device.update(
              {
                code: null,
                state: IN_STOCK_STATE,
                last_updated: Date.now(),
              },
              {
                where: {
                  serial: old_serial,
                },
              }
            )
              .then((row) => {
                console.log("SUCCESS edit TheAssignHistory");

                var assignHistorys = [];

                var assignHistory = {
                  serial: new_serial,
                  code: code,
                  content: content,
                  assign_day: assign_day,
                  active: true,
                };
                assignHistorys.push(assignHistory);

                AssignHistory.bulkCreate(assignHistorys)
                  .then(() => {
                    console.log("Add Assign Histories success");

                    console.log(
                      "assignHistorys.length: " + assignHistorys.length
                    );

                    var rowUpdate = 0;

                    for (var i = 0; i < assignHistorys.length; i++) {
                      var lastUpdated = Date.now();
                      var code = assignHistorys[i].code;
                      var serial = assignHistorys[i].serial;
                      var sate = USING_STATE;

                      console.log("serial: " + serial);
                      console.log("code: " + code);

                      Device.update(
                        {
                          code: code,
                          state: 1,
                          last_updated: Date.now(),
                        },
                        {
                          where: {
                            serial: serial,
                          },
                        }
                      )
                        .then((row) => {
                          rowUpdate = rowUpdate + 1;
                          console.log("SUCESSSSSSSSSSSS");
                          console.log("row: " + rowUpdate);
                          console.log(
                            "assignHistorys.length: " + assignHistorys.length
                          );
                          if (rowUpdate == assignHistorys.length) {
                            AssignHistory.count({
                              distinct: "code",
                              where: { code: code, active: true },
                            })
                              .then((count) => {
                                console.log(
                                  "TEST66666_AssignHistory_Count_code: " + count
                                );

                                Employee.update(
                                  {
                                    total_device: count,
                                  },
                                  {
                                    where: { code: code },
                                  }
                                )
                                  .then((row) => {
                                    console.log("SUCESSSSSSSSSSSS ");
                                    res.json({ result: true });
                                  })
                                  .catch((err) => {
                                    console.log(
                                      "Error Update Employe when add AssignHistory " +
                                        err
                                    );
                                    res.json({
                                      result: false,
                                      error: "SV1005",
                                    });
                                  });
                              })
                              .catch((err) => {
                                console.log(
                                  "TEST66666_AssignHistory_Count_code Error" +
                                    err
                                );
                                res.json({
                                  result: false,
                                  error: "SV1004",
                                });
                              });
                          }
                        })
                        .catch((err) => {
                          console.log("ERRORRRRRRRRRRR");
                          res.json({
                            result: false,
                            error: "SV1003",
                          });
                        });
                    }
                  })
                  .catch((err) => {
                    console.log("Error: ", err);
                    res.json({
                      result: false,
                      error: "SV1002",
                    });
                  });
              })
              .catch((err) => {
                console.log("Error edit TheAssignHistory 1");

                console.log(
                  "Error edit TheAssignHistory 1: err.messages: " + err.messages
                );
                res.json({
                  result: false,
                  error: "SV1001",
                });
              });
          })
          .catch((err) => {
            res.json({
              result: false,
              error: "SV1000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/editTheAssignHistory1", (req, res) => {
  console.log("/editTheAssignHistory");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.code;
        var old_serial = obj.old_serial;
        var new_serial = obj.new_serial;
        var content = obj.content;
        var assign_day = obj.assign_day;

        console.log("code: " + code);
        console.log("old_serial: " + old_serial);
        console.log("new_serial: " + new_serial);
        console.log("content: " + content);
        console.log("assign_day: " + assign_day);

        AssignHistory.update(
          {
            serial: new_serial,
            content: content,
            assign_day: assign_day,
          },
          {
            where: {
              serial: old_serial,
            },
          }
        )
          .then((row) => {
            Device.update(
              {
                code: code,
                state: USING_STATE,
                last_updated: Date.now(),
              },
              {
                where: {
                  serial: new_serial,
                },
              }
            )
              .then((row) => {
                Device.update(
                  {
                    code: null,
                    state: IN_STOCK_STATE,
                    last_updated: Date.now(),
                  },
                  {
                    where: {
                      serial: old_serial,
                    },
                  }
                )
                  .then((row) => {
                    console.log("SUCCESS edit TheAssignHistory");
                    res.json({ result: true });
                  })
                  .catch((err) => {
                    console.log("Error edit TheAssignHistory 1");

                    console.log(
                      "Error edit TheAssignHistory 1: err.messages: " +
                        err.messages
                    );
                    res.json({
                      result: false,
                      error: "SV1002",
                    });
                  });
              })
              .catch((err) => {
                console.log("Error edit TheAssignHistory 2");
                res.json({
                  result: false,
                  error: "SV1001",
                });
              });
          })
          .catch((err) => {
            console.log("Error edit TheAssignHistory 3");
            res.json({
              result: false,
              error: "SV1000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/deleteTheAssignOfEmployee", (req, res) => {
  console.log("/deleteTheAssignOfEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.code;
        var serial = obj.serial;
        var assign_day = obj.assign_day;
        var state = obj.state;

        console.log("code: " + code);
        console.log("serial: " + serial);
        console.log("assign_day: " + assign_day);
        console.log("state: " + state);

        AssignHistory.update(
          {
            active: false,
          },
          {
            where: {
              serial: serial,
              code: code,
              assign_day: assign_day,
            },
          }
        )
          .then((row) => {
            Device.update(
              {
                code: null,
                state: state,
                last_updated: Date.now(),
              },
              {
                where: {
                  serial: serial,
                },
              }
            )
              .then((row) => {
                console.log("SUCCESS edit TheAssignHistory");

                AssignHistory.count({
                  distinct: "code",
                  where: { code: code, active: true },
                })
                  .then((count) => {
                    console.log("TEST66666_AssignHistory_Count_code: " + count);

                    Employee.update(
                      {
                        total_device: count,
                      },
                      {
                        where: { code: code },
                      }
                    )
                      .then((row) => {
                        console.log("SUCESSSSSSSSSSSS ");
                        res.json({ result: true });
                      })
                      .catch((err) => {
                        console.log(
                          "Error Update Employe when add AssignHistory " + err
                        );
                        res.json({
                          result: false,
                          error: "SV8003",
                        });
                      });
                  })
                  .catch((err) => {
                    console.log(
                      "TEST66666_AssignHistory_Count_code Error" + err
                    );
                    res.json({
                      result: false,
                      error: "SV8002",
                    });
                  });
              })
              .catch((err) => {
                console.log("Error edit TheAssignHistory 1");

                console.log(
                  "Error edit TheAssignHistory 1: err.messages: " + err.messages
                );
                res.json({
                  result: false,
                  error: "SV8001",
                });
              });
          })
          .catch((err) => {
            console.log("Error edit TheAssignHistory 3: " + err);
            res.json({
              result: false,
              error: "SV8000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getTheAssignsOfDevice", (req, res) => {
  console.log("/getTheAssignsOfDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("obj: " + JSON.stringify(result));

        console.log("Serial: " + obj.serial);

        var serial = obj.serial;

        AssignHistory.findAll({
          raw: true,
        })
          .then((elementList) => {
            var element;
            //console.log("TEST999_elementList: " + JSON.stringify(elementList))

            console.log("TEST999_serial: " + serial);
            var findAssign = false;
            var assignHistoryList = [];

            for (var i = 0; i < elementList.length; i++) {
              console.log(
                "TEST999_elementList[i].serial: " + elementList[i].serial
              );
              if (serial == elementList[i].serial) {
                findAssign = true;

                element = elementList[i];

                var assignHistory = {
                  serial: element.serial,
                  code: element.code,
                  content: element.content,
                  assign_day: element.assign_day,
                };
                assignHistoryList.push(assignHistory);
              }
            }

            if (findAssign) {
              console.log(
                "TEST999_assignHistoryList_length: " + assignHistoryList.length
              );
              // for (var i = 0; i < assignHistoryList.length; i++) {
              //     console.log("TEST999_objResponse : " + assignHistoryList[i].toString)

              // }

              console.log(
                "assignHistoryListObj: " + JSON.stringify(assignHistoryList)
              );

              res.json({ result: true, data: assignHistoryList });
            } else {
              console.log("TEST999_assignHistoryList emplty");
              res.json({ result: true, data: [] });
            }
          })
          .catch((err) => {
            console.log("TEST999_: getAssignsDevice Failed");
            res.json({
              result: false,
              error: "SV2000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getTheAssignsOfDevice1", (req, res) => {
  console.log("/getTheAssignsOfDevice");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("Serial: " + obj.serial);

        var serial = obj.serial;

        AssignHistory.findAll({
          raw: true,
        })
          .then((elementList) => {
            var element;
            //console.log("TEST999_elementList: " + JSON.stringify(elementList))

            console.log("TEST999_serial: " + serial);
            var findAssign = false;
            for (var i = 0; i < elementList.length; i++) {
              console.log(
                "TEST999_elementList[i].serial: " + elementList[i].serial
              );
              if (serial == elementList[i].serial) {
                findAssign = true;
                element = elementList[i];
                break;
              }
            }

            if (findAssign) {
              var assignHistoryList = [];

              var assignHistory = {
                serial: element.serial,
                code: element.code,
                content: element.content,
                assign_day: element.assign_day,
              };

              assignHistoryList.push(assignHistory);

              console.log("TEST999_assignHistoryList: " + assignHistoryList);

              res.json({ result: true, data: assignHistoryList });
            } else {
              console.log("TEST999_assignHistoryList emplty");
              res.json({ result: true, data: [] });
            }
          })
          .catch((err) => {
            console.log("TEST999_: getAssignsDevice Failed");
            res.json({
              result: false,
              error: "SV2000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getDevicesOfState", (req, res) => {
  console.log("/getDevicesOfState");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var state = obj.state;

        console.log("state: " + state);

        Device.findAll({
          raw: true,
        })
          .then((devices) => {
            var deviceList = [];
            var i = 0;

            console.log("TEST8888:devices.length: " + devices.length);
            if (devices.length == 0) {
              res.json({ result: true, data: [] });
            }
            devices.forEach((element) => {
              if (element.state == state) {
                var device = {
                  serial: element.serial,
                  code: element.code,
                  property_type: element.property_type,
                  device_type: element.device_type,
                  supplier: element.supplier,
                  brand: element.brand,
                  model: element.model,
                  price: element.price,
                  purchase_day: element.purchase_day,
                  warranty_time: element.warranty_time,
                  warranty_time_unit: element.warranty_time_unit,
                  state: element.state,
                  begin_using_day: element.begin_using_day,
                  note: element.note,
                  last_updated: element.last_updated,
                };
                deviceList.push(device);
              }

              if (i == devices.length - 1) {
                console.log("TEST8888:deviceList.length: " + deviceList.length);
                res.json({ result: true, data: deviceList });
                return;
              }
              i = i + 1;
            });
          })
          .catch((err) => {
            console.log(err);
            res.json({
              result: false,
              error: "SV5000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getTheAssignsOfEmployee", (req, res) => {
  console.log("/getTheAssignsOfEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        console.log("obj: " + obj);

        var code = obj.code;

        console.log("code: " + code);

        AssignHistory.findAll({
          raw: true,
        })
          .then((assignHistories) => {
            var assignHistoryList = [];
            var i = 0;

            if (assignHistories.length == 0) {
              res.json({ result: true, data: [] });
            }

            console.log("assignHistories.length: " + assignHistories.length);
            assignHistories.forEach((element) => {
              if (element.code == code && element.active) {
                var assignHistory = {
                  serial: element.serial,
                  code: element.code,
                  content: element.content,
                  assign_day: element.assign_day,
                };

                assignHistoryList.push(assignHistory);
              }

              if (i == assignHistories.length - 1) {
                console.log(
                  "assignHistoryList.length: " + assignHistoryList.length
                );
                res.json({ result: true, data: assignHistoryList });
                return;
              }
              i = i + 1;
            });
          })
          .catch((err) => {
            console.log("Can't get Assign Histories ");
            res.json({
              result: false,
              error: "SV6000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.post("/getTheAssignsOfEmployee1", (req, res) => {
  console.log("/getTheAssignsOfEmployee");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        const result = req.body;

        var obj = JSON.parse(JSON.stringify(result));

        var code = obj.code;

        console.log("code: " + code);

        AssignHistory.findAll({
          raw: true,
        })
          .then((assignHistories) => {
            var assignHistoryList = [];
            var i = 0;

            if (assignHistories.length == 0) {
              res.json({ result: true, data: [] });
            }

            console.log("assignHistories.length: " + assignHistories.length);
            assignHistories.forEach((element) => {
              if (element.code == code) {
                var assignHistory = {
                  serial: element.serial,
                  code: element.code,
                  content: element.content,
                  assign_day: element.assign_day,
                };

                assignHistoryList.push(assignHistory);
              }

              if (i == assignHistories.length - 1) {
                console.log(
                  "assignHistoryList.length: " + assignHistoryList.length
                );
                res.json({ result: true, data: assignHistoryList });
                return;
              }
              i = i + 1;
            });
          })
          .catch((err) => {
            console.log("Can't get Assign Histories ");
            res.json({
              result: false,
              error: "SV6000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.get("/getEmployees", (req, res) => {
  console.log("/getEmployees");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        Employee.findAll({
          raw: true,
        })
          .then((employees) => {
            if (employees.length == 0) {
              res.json({ result: true, data: [] });
            }

            var employeeList = [];

            console.log("employees length: " + employees.length);

            employees.forEach((element) => {
              var employee = {
                code: element.code,
                name: element.name,
                position: element.position,
                email: element.email,
                role: element.role,
                phone: element.phone.split(".").join(""),
                birthday: element.birthday,
                total_device: element.total_device,
                note: element.note,
                office: element.office,
                avatar_url: element.avatar_url,
                last_updated: element.last_updated,
              };
              employeeList.push(employee);
            });

            console.log("employeeList length: " + employeeList.length);
            res.json({ result: true, data: employeeList });
          })
          .catch((err) => {
            console.log("Get employees error:  " + err);
            res.json({
              result: false,
              error: "SV7000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});


app.get("/getEmployeesPage", (req, res) => {
  console.log("/getEmployeesPage");

  const page =  req.query.page
  const limit =  req.query.limit

  console.log("page: "+ page);

  console.log("limit: "+ limit);

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

 

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        Employee.findAll({
          raw: true,
        })
          .then((employees) => {
            if (employees.length == 0) {
              res.json({ result: true, data: [] });
            }
      
            var employeeList = [];
      
            console.log("employees length: " + employees.length);
      
            employees.forEach((element) => {
              var employee = {
                code: element.code,
                name: element.name,
                position: element.position,
                email: element.email,
                role: element.role,
                phone: element.phone.split(".").join(""),
                birthday: element.birthday,
                total_device: element.total_device,
                note: element.note,
                office: element.office,
                avatar_url: element.avatar_url,
                last_updated: element.last_updated,
              };
              employeeList.push(employee);
            });
      
            var employeeListResult = [];
      
            console.log("employeeList length1: " + employeeListResult.length);
           
      
            const startPoint = limit*page
            const endPoint = limit * (Number(page) + 1)
      
            console.log("startPoint: " + startPoint);
            console.log("endPoint: " + endPoint);
      
            if(startPoint >= employeeList.length) {
              console.log("Get employees error start poit over lenght:  ");
              res.json({
                result: false,
                error: "SV7111",
              });
              return
            }
      
            if (endPoint <= employeeList.length) {
              for (var i = startPoint; i < limit * (Number(page) + 1); i++) {
                employeeListResult.push(employeeList[i])
              }
        
            } else {
              console.log("ABBBBBB: " + employeeList.length);
              for (var i = startPoint; i < employeeList.length; i++) {
                employeeListResult.push(employeeList[i])
              }
        
            }
          
           
            console.log("employeeList length2: " + employeeListResult.length);
            res.json({ result: true, data: employeeListResult });
          })
          .catch((err) => {
            console.log("Get employees error:  " + err);
            res.json({
              result: false,
              error: "SV7000",
            });
          });
      
        }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});


app.get("/getDevicesPage", (req, res) => {
  console.log("/getDevicesPage");

  const page =  req.query.page
  const limit =  req.query.limit

  console.log("page: "+ page);

  console.log("limit: "+ limit);

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

 

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS
        Device.findAll({
          raw: true,
        })
          .then((devices) => {
            console.log("devices.length:  " + devices.length);
            if (devices.length == 0) {
              res.json({ result: true, data: [] });
            }

            var deviceList = [];
          
            devices.forEach((element) => {
              var device = {
                serial: element.serial,
                code: element.code,
                property_type: element.property_type,
                device_type: element.device_type,
                supplier: element.supplier,
                brand: element.brand,
                model: element.model,
                price: element.price,
                purchase_day: element.purchase_day,
                warranty_time: element.warranty_time,
                warranty_time_unit: element.warranty_time_unit,
                state: element.state,
                begin_using_day: element.begin_using_day,
                note: element.note,
                last_updated: element.last_updated,
              };
              deviceList.push(device);
  
            });


            var deviceListResult = [];
      
            const startPoint = limit*page
            const endPoint = limit * (Number(page) + 1)
      
            console.log("startPoint: " + startPoint);
            console.log("endPoint: " + endPoint);
      
            if(startPoint >= deviceList.length) {
              console.log("Get device error start poit over lenght:  ");
              res.json({
                result: false,
                error: "SV8111",
              });
              return
            }
      
            if (endPoint <= deviceList.length) {
              for (var i = startPoint; i < limit * (Number(page) + 1); i++) {
                deviceListResult.push(deviceList[i])
              }
        
            } else {
              console.log("ABBBBBB: " + deviceList.length);
              for (var i = startPoint; i < deviceList.length; i++) {
                deviceListResult.push(deviceList[i])
              }
        
            }
           
            console.log("deviceListResult length: " + deviceListResult.length);
            res.json({ result: true, data: deviceListResult });


          })
          .catch((err) => {
            console.log("Get Device failed ");
            res.json({
              result: false,
              error: "SV3000",
            });
          });
       
        }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});


app.get("/getEmployeesNew", (req, res) => {
  console.log("/getEmployees");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        //AUTHEN TOKEN SUCCESS

        Employee.findAll({
          raw: true,
        })
          .then((employees) => {
            if (employees.length == 0) {
              res.json({ result: true, data: [] });
            }

            var employeeList = [];

            console.log("employees length: " + employees.length);

            employees.forEach((element) => {
              var employee = {
                code: element.code,
                name: element.name,
                total_device: element.total_device,
                avatar_url: element.avatar_url,
                last_updated: element.last_updated,
              };
              employeeList.push(employee);
            });

            console.log("employeeList length: " + employeeList.length);
            res.json({ result: true, data: employeeList });
          })
          .catch((err) => {
            console.log("Get employees error:  " + err);
            res.json({
              result: false,
              error: "SV7000",
            });
          });
      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
});

app.get("/getEmployeesTest", (req, res) => {
  console.log("/getEmployees");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  Employee.findAll({
    raw: true,
  })
    .then((employees) => {
      if (employees.length == 0) {
        res.json({ result: true, data: [] });
      }

      var employeeList = [];

      console.log("employees length: " + employees.length);

      employees.forEach((element) => {
        var employee = {
          code: element.code,
          name: element.name,
          total_device: element.total_device,
          avatar_url: element.avatar_url,
          last_updated: element.last_updated,
        };
        employeeList.push(employee);
      });

      console.log("employeeList length: " + employeeList.length);
      res.json({ result: true, data: employeeList, text: "OK" });
    })
    .catch((err) => {
      console.log("Get employees error:  " + err);
      res.json({
        result: false,
        error: "SV7000",
      });
    });
});

app.get("/getImage/:name", (req, res) => {
  console.log("/getImage");

  var name = req.params.name
  console.log("name: " + name);

  var pathName = "/images/" + name


  fs.exists(__dirname + pathName, (result) => {
    console.log(" result: " + result)
    if (result) {
      res.sendFile(__dirname + pathName)
    } else {
      res.json({ "result": false, "error": "FILE404" })
    }

  })
});

app.get("/albums/1/photos", (req, res) => {
  console.log("/albums/1/photos");


});

const uploadImage = async (req, res, next) => {
  console.log("/upload/image");

  const headers = req.headers;
  var headersRequest = JSON.parse(JSON.stringify(headers));
  var token = headersRequest.token;

  console.log("LOG_TEST_Header_Request token: " + token);

  UserToken.findAll({
    raw: true,
  }).then((elements) => {
    console.log("TEST999_UserToken elements.length: " + elements.length);

    var findResult = false;
    var expiresTime = 0;
    for (var i = 0; i < elements.length; i++) {
      if (token == elements[i].token) {
        findResult = true;
        expiresTime = elements[i].expires;
        break;
      }
    }

    if (findResult) {
      console.log("expiresTime: " + expiresTime);
      var now = Date.now();
      console.log("Date.now(): " + now);
      if (expiresTime < now) {
        console.log("401");
        UserToken.destroy({
          where: {
            token: token,
          },
        })
          .then((row) => {
            res.status(401).send({
              result: false,
              error: "401",
            });
          })
          .catch((err) => {
            console.log("UserToken.destroy Error: " + err);
          });
      } else {
        const body = req.body;

        var obj = JSON.parse(JSON.stringify(body));

        var name = obj.image_name

        var code = obj.code

        // console.log("body: " + JSON.stringify(body));

        let fileName = "image" + Date.now() + "." + "png";
        try {

          console.log(" obj.name: " + name)
          console.log(" obj.base64_image: " + obj.base64_image)
          console.log(" fileName: " + fileName)

          fs.writeFileSync("./images/" + fileName, obj.base64_image, 'base64');

          var avatar_url = "http://192.168.0.83:3000/getImage/" + fileName

          var pathName = "/images/" + name

          console.log("__dirname: " + __dirname)

          console.log(" pathName: " + pathName)

          console.log("avatar_url: " + avatar_url)

          Employee.update(
            {
              avatar_url: avatar_url,
            },
            {
              where: { code: code },
            }
          )
            .then((row) => {
              console.log("SUCESSSSSSSSSSSS ");

              if (name.length > 0) {
                fs.exists(__dirname + pathName, (result) => {
                  console.log(" result: " + result)
                  if (result) {

                    fs.unlink(__dirname + pathName, function (err) {
                      if (err) return res.json({
                        result: false,
                        error: "UP_DELETE_100",
                      });;
                      console.log('file deleted successfully');
                      res.json({
                        result: true
                      });
                    });


                  } else {
                    res.json({
                      result: true
                    });
                  }

                })
              } else {
                res.json({
                  result: true
                });
              }

            })
            .catch((err) => {
              console.log(
                "Error Update Employe when add upload file image " +
                err.messages
              );
              res.json({
                result: false,
                error: "UP_113",
              });
            });
        } catch (e) {
          res.json({
            result: false,
            error: "UP100",
          });
          next(e);
        }


        // // to declare some path to store your converted image
        // var matches = body.base64image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
        //   response = {};

        // if (matches.length !== 3) {
        //   res.json({
        //     result: false,
        //     error: "UP300",
        //   });
        //   return new Error('Invalid input string');
        // }

        // response.type = matches[1];
        // response.data = new Buffer(matches[2], 'base64');
        // let decodedImg = response;
        // let imageBuffer = decodedImg.data;
        // let type = decodedImg.type;
        // let extension = mime.extension(type);
        // let fileName = "image." + extension;
        // try {
        //   fs.writeFileSync("./images/" + fileName, imageBuffer, 'utf8');
        //   return res.json({
        //     result: true,
        //     data: { url: "After" },
        //   });
        // } catch (e) {
        //   next(e);
        // }

      }
    } else {
      console.log("403 ");
      res.status(403).send({
        result: false,
        error: "403",
      });
    }
  });
}

app.post('/upload/image', uploadImage)



// TEMP ===================================================================================================================================

// app.post("/addAssignHistory", (req, res) => {

//     console.log("/addAssignHistory")
//     const result = req.body

//     var obj = JSON.parse(JSON.stringify(result));

//     console.log("serial: " + obj.serial)
//     AssignHistory.create({
//         serial: obj.serial,
//         code: obj.code,
//         content: obj.content,
//         assign_day: obj.assign_day
//     })
//         .then(row => {
//             console.log("Add success AssignHistory ")
//             res.json({ "result": true })
//         })
//         .catch(err => {
//             console.log("Add fail AssignHistory ")
//             res.json({ "result": false })
//         })

// })

// app.post("/getUser", (req, res) => {

//     console.log("/getUser")
//     const body = req.body

//     var obj = JSON.parse(JSON.stringify(body));

//     console.log("obj.user_code: " + obj.user_code)

//     Employee.find({
//         raw: true
//     }, {
//         where: { code: obj.user_code }
//     })
//         .then(user => {
//             console.log("user name: " + user.name)
//             var user = {
//                 code: user.code, name: user.name, position: user.position, email: user.email,
//                 role: user.role, phone: user.phone, birthday: user.birthday, total_device: user.total_device, note: user.note, office: user.office,
//                 avatar_url: user.avatar_url, last_updated: user.last_updated
//             }
//             res.json({ "result": true, "user": { user } })
//         })
//         .catch(err => {
//             console.log("User is not found ")
//             res.json({ "result": false, "error": "SE:002" })
//         })
// })

// app.post("/addDeviceList", (req, res) => {

//     console.log("/addDeviceList")
//     const body = req.body

//     console.log("body: " + JSON.stringify(body))

//     var obj = JSON.parse(JSON.stringify(body))

//     console.log("obj length: " + obj.length)

//     var deviceList = []
//     obj.forEach(element => {

//         console.log("element: " + JSON.stringify(element))

//         var device = {
//             serial: element.serial, code: element.code, property_type: element.property_type, device_type: element.device_type, supplier: element.supplier,
//             brand: element.brand, model: element.model, price: element.price, purchase_day: element.purchase_day, warranty_time: element.warranty_time,
//             warranty_time_unit: element.warranty_time_unit, state: element.state, begin_using_day: element.begin_using_day, note: element.note, last_updated: element.last_updated
//         }
//         deviceList.push(device)

//     });

//     console.log("deviceList length: " + deviceList.length)

//     // var deviceNoteList = []
//     // obj.forEach(element => {
//     //     var deviceNotes = element.notes
//     //     deviceNotes.forEach(note => {
//     //         deviceNoteList.push({ serial: element.serial, content: note.content, noteDate: note.noteDate })
//     //     })
//     // });

//     // DeviceNote.bulkCreate(deviceNoteList).then(() => console.log("Add data success"))
//     //     .catch((err) => console.log("Error: ", err.messages))

//     Device.bulkCreate(deviceList).then(() => console.log("Add data success"))
//         .catch((err) => console.log("Error: ", err.messages))
// })

// app.post("/addEmployees", (req, res) => {

//     console.log("/addEmployees")

//     if (addEmployee == 0) {
//         addEmployee = 1

//         const body = req.body

//         console.log("body: " + JSON.stringify(body))

//         var obj = JSON.parse(JSON.stringify(body))

//         console.log("TEST999_employeeList_Size: " + obj.length)

//         var employeeList = []
//         obj.forEach(element => {
//             var employee = {
//                 code: element.code, name: element.name, position: element.position, email: element.email, password: element.password,
//                 role: element.role, phone: element.phone, birthday: element.birthday, total_device: element.total_device, note: element.note, office: element.office,
//                 avatar_url: element.avatar_url, last_updated: element.last_updated
//             }
//             employeeList.push(employee)
//         });

//         Employee.bulkCreate(employeeList).then(() => console.log("Add data success"))
//             .catch((err) => console.log("Error: ", err.messages))
//     }

// })

//ADD ASSIGNS HISTORY===========================

// Employee.findAll({
//     raw: true
// })
//     .then(users => {
//         console.log("users length: " + users.length)
//         users.forEach(element => {
//             var code = element.code
//             console.log("TEST999_element: " + element.code)
//             userIdList.push(code)

//             userIdList1.push(code)
//         })

//         console.log("TEST999_userIdList: " + userIdList.length)

//     })

// Device.findAll({
//     raw: true
// })
//     .then(devices => {
//         console.log("devices length: " + devices.length)

//         for (var i = 0; i < devices.length; i++) {
//             Device.update({
//                 state: 0
//             }, {
//                 where: { code: null }
//             })
//                 .then(row => {
//                     console.log("SUCESSSSSSSSSSSS ")

//                 })
//                 .catch(err => {
//                     console.log("Error Update Employe when add AssignHistory " + err.messages)

//                 })

//         }
//     })

// Employee.findAll({
//     raw: true
// })
//     .then(employees => {
//         var employeeList = []
//         console.log("employees length: " + employees.length)
//         employees.forEach(element => {
//             var name = element.name
//             var words = name.split(' ')
//             console.log("TEST999_name: " + name)
//             console.log("TEST999_words_length: " + words.length)

//             var username = ""
//             var endName = ""
//             for (var i = 0; i < words.length; i++) {

//                 if (i != words.length - 1) {
//                     username = username + words[i].substring(0, 1);
//                 } else {
//                     endName = words[i]
//                 }

//                 console.log("TEST999_word: " + words[i])
//             }

//             username = endName + username + "@itsj-group"
//             console.log("TEST999_username: " + username)

//             username = username.toLowerCase()

//             usernames.push(username)
//         })
//     })

// var employeeList = []
// var code = "ITSJ2000754670494"
// var employee = {
//     code: code, name: "IT", position: "IT", email: "it", password: "123456",
//     role: "admin", phone: "0909999999", birthday: "0", total_device: "0", note: "", office: "Athena", last_updated: Date.now()
// }
// employeeList.push(employee)

// Employee.bulkCreate(employeeList).then(() => {

//                      const token = jwt.sign(
//                         { code: code },
//                         'RANDOM_TOKEN_SECRET');

//                     console.log("token " + token)

//                     var expTime = Date.now() + DayTime

//                     console.log("expTime " + expTime)

//                     UserToken.create({
//                         token: token,
//                         code: code,
//                         expires: expTime
//                     }).then(row => {
//                         //res.json({ "result": true, "token": token })
//                         console.log("UserToken.create success")
//                     }).catch(err => {
//                         console.log("Login fail " + err)
//                         //res.json({ "result": false, error: err.messages })
//                     })
// })
//     .catch((err) => console.log("Error9999999: ", err))

app.listen(3000, () => console.log("Server start!!!"));
