import { Container, Nav, Navbar } from "react-bootstrap";

export default (props) => {
  const ver = "v0.20";
  return (
    <Navbar bg="dark" variant="dark" expand="md">
      <Container>
        <Navbar.Brand href="/#/home"> UCL_Sora {ver} </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/*                    <Nav.Link href="/#/home"> Home </Nav.Link>
                    <Nav.Link href="/#/info"> Info </Nav.Link>
                    <Nav.Link href="/#/vr"> VR </Nav.Link>
                    <Nav.Link href="/#/vr_novideo"> VR NoVideo</Nav.Link>
                    <Nav.Link href="/#/flatVideo">flatVideo</Nav.Link>
                    <Nav.Link href="/#/autovr"> AutoVR </Nav.Link>
                    <Nav.Link href="/#/skyway"> Skyway </Nav.Link>
                    <Nav.Link href="/#/admin"> Admin </Nav.Link>
                    <Nav.Link href="/#/swrecv"> Recv </Nav.Link>
                    <Nav.Link href="/#/autosend"> AutoSend </Nav.Link>
            <Nav.Link href="/sendrecv"> Send/Recv </Nav.Link>
    */}
            <Nav.Link href="/sora"> Home </Nav.Link>
            <Nav.Link href="/vr"> VR </Nav.Link>
            <Nav.Link href="/avp_test"> AVP_Test </Nav.Link>
            <Nav.Link href="/vr_novideo"> VR_NoVideo </Nav.Link>
            <Nav.Link href="/vr_avp_canon"> AVP_Canon </Nav.Link>
            <Nav.Link href="/vr_avp"> VisionPro </Nav.Link>
            <Nav.Link href="/recvonly"> Video </Nav.Link>
            <Nav.Link href="/sendonly"> Send </Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link href="https://ucl.nuee.nagoya-u.ac.jp">
              {" "}
              UCLab HP{" "}
            </Nav.Link>
            <Nav.Link href="https://www.youtube.com/channel/UCrf5seeEdvN-0XCEH5hTdfw">
              {" "}
              YouTube Channel{" "}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
