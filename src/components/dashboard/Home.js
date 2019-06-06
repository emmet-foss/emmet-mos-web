import React, { Component } from 'react';
import {
  PageHeader,
  Statistic,
  Row,
  Col,
  Select,
  DatePicker,
  List,
  Button,
  Avatar,
  message,
} from 'antd';

import emmetAPI from '../../emmetAPI';
import disablePastDates from '../../helpers/functions';

import 'antd/dist/antd.css';
import './Home.css';

const Option = Select.Option;

class Home extends Component {
  state = {
    locations: [],
    selectedLocation: '',
    menus: [],
    selectedMenu: '',
    date_available: null,
    menuItemsAvailable: [],
    loading: false,
    menuItemsQueried: false,
  };

  componentDidMount() {
    this.getLocations()
      .then(res => this.setState({ locations: res.locations }))
      .catch(err => console.log(err));
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location !== this.props.location) {
      this.getLocations()
      .then(res => this.setState({ locations: res.locations }))
      .catch(err => console.log(err));
    }
  }

  getLocations = async () => {
    const response = await emmetAPI.getUrl('/api/v1/stores/locations')
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  };

  getMenus = async (location) => {
    const response = await emmetAPI.getUrl(`/api/v1/stores/menus?location=${location}`)
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  };

  handleLocationChange = async (location) => {
    this.setState({
      loading: true,
      selectedLocation: location,
      menus: [],
      selectedMenu: '',
      date_available: null,
      menuItemsAvailable: [],
    });
    this.getMenus(location)
      .then(res => {
        this.setState({
          loading: false,
          menus: res.menus,
        })
      })
      .catch(err => console.log(err));
  };

  handleMenuChange = async (selectedMenu) => {
    this.setState({
      selectedMenu,
      menuItemsAvailable: [],
      date_available: null,
      menuItemsQueried: false
    });
  }

  getMenuItemsAvailable = async (location, date_available) => {
    const { selectedMenu } = this.state
    const response = await emmetAPI.getUrl(`/api/v1/stores/menu_items?menuId=${selectedMenu}&location=${location}&date_available=${date_available}`)
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  };

  queryAvailableMenuItems = async (date_available, dateString) => {
    this.setState({ date_available, menuItemsQueried: true });
    this.getMenuItemsAvailable(this.state.selectedLocation, dateString)
      .then(res => {
        this.setState({
          loading: false,
          menuItemsAvailable: res.menuItems,
        })
      })
      .catch(err => console.log(err));
  };

  addMenuItemToCart = async(menuItemId, storeId, guest) => {
    emmetAPI.fetchUrl(`/api/v1/cart/${guest._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menuItemId,
        storeId,
      }),
    })
    .then(res => {
      if (res.status === 200) {
        message.success('Item successfully added to cart.');
        console.log('res', res)
      } else {
        const error = new Error(res.error);
        throw error;
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error adding item to cart. Please try again');
    });
  }

  addToCart = async(menuItem, storeId) => {
    const guest_id = localStorage.getItem('guest_id');
    if (!guest_id || guest_id === "null") {
      console.log('new guest account')
      const response = await emmetAPI.fetchUrl(`/api/v1/guests`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: "guest"
        }),
      });

      const body = await response.text();
      const guest = JSON.parse(body).guest;
      localStorage.setItem('guest_id', guest._id);

      this.addMenuItemToCart(menuItem, storeId, guest);

    } else {
      emmetAPI.getUrl(`/api/v1/guests/${guest_id}`)
      .then(async (res) => {
        if (res.status === 200) {
          const body = await res.text()
          const guest = JSON.parse(body).guest;
          console.log('existing guest', guest)
          if (!guest) {
            message.error("Guest not found")
            throw Error("Guest not found");
          }
          this.addMenuItemToCart(menuItem, storeId, guest);
        } else {
          const error = new Error(res.error);
          throw error;
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error adding item to cart. Please try again');
      });
    }
  }

  render() {
    const {
      locations,
      menus,
      loading,
      selectedLocation,
      selectedMenu,
      menuItemsAvailable,
      menuItemsQueried,
    } = this.state;
    const displayMenus = !loading && selectedLocation !== '';
    const displayDate = selectedMenu !== '';

    let menusDisplay = null
    if (menuItemsAvailable.length > 0) {
      menusDisplay = (
        <Row>
          <Col xs={24} sm={24} md={24} lg={12}>
            <Statistic value="Here are the menus available:" />
            <List
              itemLayout="horizontal"
              bordered
              size="large"
              dataSource={this.state.menuItemsAvailable}
              renderItem={menuItem => (
                <List.Item
                  key={menuItem._id}
                >
                  <List.Item.Meta
                    avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
                    title={menuItem.name}
                  />
                  <div>
                    <Button
                      type="primary"
                      onClick={this.addToCart.bind(this, menuItem._id, menuItem.storeId)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </List.Item>
              )}
            />
          </Col>
        </Row>
      )
    } else {
      menusDisplay = (
        <Row>
          <Col xs={24} sm={24} md={24} lg={12}>
            <Statistic value="No Menu Available." />
          </Col>
        </Row>
      )
    }

    const name = localStorage.getItem('name') ? localStorage.getItem('name') : "Guest";
    return (
      <PageHeader
        title={`Welcome ${name} to Emmet Ordering System!`}
      >
        <div className="wrap">
          <div className="extraContent">
            <Row>
              <Col xs={24} sm={24} md={24} lg={12}>
                <Statistic value="Where will you be attending?" />
                <Select
                  style={{ width: '100%' }}
                  placeholder="Search a location"
                  dropdownMatchSelectWidth={false}
                  onChange={this.handleLocationChange}
                  value={selectedLocation}
                >
                  {locations.map(location => {
                    return <Option key={location} value={location}>{location}</Option>
                  })}
                </Select>
              </Col>
            </Row>
            {displayMenus &&
              <Row>
                <Col xs={24} sm={24} md={24} lg={12}>
                  <Statistic value="What will you be ordering?" />
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Choose a menu"
                    dropdownMatchSelectWidth={false}
                    onChange={this.handleMenuChange}
                    value={selectedMenu}
                  >
                    {loading &&
                      <div>loading</div>
                    }
                    {!loading && menus.map(menu => {
                      return <Option key={menu._id} value={menu._id}>{menu.name}</Option>
                    })}
                  </Select>
                </Col>
              </Row>
            }
            {displayDate &&
              <Row>
                <Col xs={24} sm={24} md={24} lg={12}>
                  <Statistic value="When will you attend?" />
                  <DatePicker
                    placeholder="Select Time"
                    // disabledDate={disablePastDates}
                    onChange={this.queryAvailableMenuItems}
                    value={this.state.date_available}
                    style={{ width: '100%'}}
                  />
                </Col>
              </Row>
            }
            {menuItemsQueried && menusDisplay}
          </div>
        </div>
      </PageHeader>

    );
  }
}

export default Home;
